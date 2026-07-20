#!/usr/bin/env python3
"""
GridPilot - Local Development Runner
This script handles the startup of:
1. FastAPI Backend (Port 8000)
2. OCPP 1.6 Mock Server (Port 9000)
3. Next.js Frontend (Port 3000)

Usage:
  python run_local.py [--setup] [--no-ocpp] [--port-backend 8000] [--port-frontend 3000]
"""

import os
import sys
import time
import subprocess
import argparse
import threading
import signal
from pathlib import Path

# Beautiful ANSI Colors
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Cross-platform color support for Windows CMD/PowerShell
if os.name == 'nt':
    os.system('color')

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== {text} ==={Colors.ENDC}")

def print_success(text):
    print(f"{Colors.OKGREEN}[✓] {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}[i] {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}[!] {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}[✗] {text}{Colors.ENDC}")

def log_stream(stream, prefix, color):
    """Logs the output of a subprocess stream in real-time with prefix."""
    try:
        for line in iter(stream.readline, ''):
            if not line:
                break
            cleaned_line = line.strip()
            if cleaned_line:
                print(f"{color}{prefix} | {cleaned_line}{Colors.ENDC}")
    except Exception as e:
        pass

def run_command_live(command, cwd=None, env=None):
    """Runs a command and streams its output to the terminal."""
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Stream output
    for line in iter(process.stdout.readline, ''):
        print(line, end='')
    
    process.wait()
    return process.returncode

def terminate_process(proc, name):
    """Terminates a process and its children cleanly."""
    if not proc:
        return
    
    print_info(f"Stopping {name}...")
    if os.name == 'nt':
        # On Windows, kill the process tree
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except Exception:
            try:
                proc.terminate()
            except Exception:
                pass
    else:
        # On Unix, terminate and wait
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            try:
                proc.kill()
            except Exception:
                pass
        except Exception:
            pass

class LocalRunner:
    def __init__(self, run_setup=False, start_ocpp=True, backend_port=8000, frontend_port=3000):
        self.run_setup = run_setup
        self.enable_ocpp = start_ocpp
        self.backend_port = backend_port
        self.frontend_port = frontend_port
        self.processes = {}
        self.threads = []
        self.is_shutting_down = False
        self.project_root = Path(__file__).resolve().parent

    def verify_environment(self):
        print_header("Verifying Dependencies & Environment")
        
        # Check Node.js
        try:
            node_version = subprocess.check_output("node --version", shell=True, text=True).strip()
            print_success(f"Node.js detected: {node_version}")
        except Exception:
            print_error("Node.js is not installed or not in PATH! Please install Node.js (>=24) to run the frontend.")
            sys.exit(1)

        # Check Python
        python_exe = sys.executable
        print_success(f"Python detected: {python_exe}")

        # Check frontend/package.json
        frontend_path = self.project_root / "frontend"
        if not (frontend_path / "package.json").exists():
            print_error(f"Frontend directory not found at {frontend_path}!")
            sys.exit(1)

        # Check node_modules
        if not (frontend_path / "node_modules").exists():
            print_warning("node_modules folder not found in frontend. Running npm install...")
            ret = run_command_live("npm install", cwd=str(frontend_path))
            if ret != 0:
                print_error("npm install failed! Please resolve frontend dependency issues.")
                sys.exit(1)
            print_success("Frontend dependencies installed.")
        else:
            print_success("Frontend node_modules already installed.")

    def run_initial_setup(self):
        print_header("Running GridPilot Setup Pipeline")
        print_info("This trains demand models, anomaly detection, downloads data, and validates depot simulation.")
        setup_script = self.project_root / "scripts" / "setup.py"
        ret = run_command_live(f"{sys.executable} {setup_script}")
        if ret != 0:
            print_error("Setup pipeline failed! Please resolve the errors above.")
            sys.exit(1)
        print_success("GridPilot setup completed successfully.")

    def start_backend(self):
        print_info(f"Starting Backend API Server on http://localhost:{self.backend_port}...")
        cmd = f"{sys.executable} -m uvicorn api.main:app --host 127.0.0.1 --port {self.backend_port}"
        
        proc = subprocess.Popen(
            cmd,
            cwd=str(self.project_root),
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self.processes["backend"] = proc
        
        # Start logging threads
        t_out = threading.Thread(target=log_stream, args=(proc.stdout, "BACKEND", Colors.OKBLUE), daemon=True)
        t_err = threading.Thread(target=log_stream, args=(proc.stderr, "BACKEND_ERR", Colors.FAIL), daemon=True)
        t_out.start()
        t_err.start()
        self.threads.extend([t_out, t_err])

    def start_ocpp(self):
        print_info("Starting OCPP 1.6 Mock Central System & Chargers...")
        ocpp_script = self.project_root / "scripts" / "start_ocpp.py"
        cmd = f"{sys.executable} {ocpp_script}"
        
        proc = subprocess.Popen(
            cmd,
            cwd=str(self.project_root),
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self.processes["ocpp"] = proc
        
        t_out = threading.Thread(target=log_stream, args=(proc.stdout, "OCPP", Colors.WARNING), daemon=True)
        t_err = threading.Thread(target=log_stream, args=(proc.stderr, "OCPP_ERR", Colors.FAIL), daemon=True)
        t_out.start()
        t_err.start()
        self.threads.extend([t_out, t_err])

    def start_frontend(self):
        print_info(f"Starting Next.js Frontend Server on http://localhost:{self.frontend_port}...")
        frontend_path = self.project_root / "frontend"
        
        # Configure Next.js port via environment variable
        env = os.environ.copy()
        env["PORT"] = str(self.frontend_port)
        
        cmd = "npm run dev"
        proc = subprocess.Popen(
            cmd,
            cwd=str(frontend_path),
            env=env,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self.processes["frontend"] = proc
        
        t_out = threading.Thread(target=log_stream, args=(proc.stdout, "FRONTEND", Colors.OKCYAN), daemon=True)
        t_err = threading.Thread(target=log_stream, args=(proc.stderr, "FRONTEND_ERR", Colors.FAIL), daemon=True)
        t_out.start()
        t_err.start()
        self.threads.extend([t_out, t_err])

    def shutdown(self):
        if self.is_shutting_down:
            return
        self.is_shutting_down = True
        print_header("Shutting Down GridPilot Development Servers")
        
        # Terminate in reverse order
        for name in ["frontend", "ocpp", "backend"]:
            if name in self.processes:
                terminate_process(self.processes[name], name)
        
        print_success("All servers stopped. Goodbye!")
        sys.exit(0)

    def run(self):
        self.verify_environment()
        
        if self.run_setup:
            self.run_initial_setup()
            
        # Register shutdown handler
        def sig_handler(sig, frame):
            self.shutdown()
            
        signal.signal(signal.SIGINT, sig_handler)
        signal.signal(signal.SIGTERM, sig_handler)

        print_header("Launching GridPilot Services")
        self.start_backend()
        
        # Give backend a moment to initialize database
        time.sleep(2)
        
        if self.enable_ocpp:
            self.start_ocpp()
            time.sleep(1)
            
        self.start_frontend()
        
        print_header("GridPilot Local Instance Ready")
        print(f"  {Colors.BOLD}* Frontend Dashboard:{Colors.ENDC}  http://localhost:{self.frontend_port}")
        print(f"  {Colors.BOLD}* API Documentation:{Colors.ENDC}   http://localhost:{self.backend_port}/docs")
        print(f"  {Colors.BOLD}* Interactive API Ping:{Colors.ENDC} http://localhost:{self.backend_port}/ping")
        print("  Press Ctrl+C to terminate all services.")
        print("-" * 65 + "\n")

        # Monitor processes
        try:
            while True:
                # Check if any process has exited unexpectedly
                for name, proc in list(self.processes.items()):
                    ret = proc.poll()
                    if ret is not None:
                        if not self.is_shutting_down:
                            print_error(f"Service '{name}' exited unexpectedly with return code {ret}.")
                            self.shutdown()
                time.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            self.shutdown()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GridPilot Local Runner")
    parser.add_argument("--setup", action="store_true", help="Run the full setup pipeline (data download + model training) before starting servers")
    parser.add_argument("--no-ocpp", action="store_true", help="Disable the OCPP mock central system and chargers")
    parser.add_argument("--port-backend", type=int, default=8000, help="FastAPI backend port (default: 8000)")
    parser.add_argument("--port-frontend", type=int, default=3000, help="Next.js frontend port (default: 3000)")
    
    args = parser.parse_args()
    
    runner = LocalRunner(
        run_setup=args.setup,
        start_ocpp=not args.no_ocpp,
        backend_port=args.port_backend,
        frontend_port=args.port_frontend
    )
    runner.run()
