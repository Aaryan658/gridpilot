# GridPilot Backend Deployment

Use this when the Vercel frontend needs real optimizer results instead of demo fallback data.

## Recommended Path: Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. If using a normal Web Service, use:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/health`
4. Set the environment variable:
   - `PYTHON_VERSION=3.11.9`
   - `BACKEND_CORS_ORIGINS=https://frontend-nine-virid-4bi7088jda.vercel.app`
5. Deploy and copy the backend URL, for example:
   - `https://gridpilot-backend.onrender.com`

The scientific dependencies are pinned for Python 3.11. If Render uses Python
3.14, pandas will try to compile from source and the build will fail.

## Connect Vercel Frontend

In the Vercel project for the frontend, add:

```text
NEXT_PUBLIC_API_URL=https://your-backend-url
```

Then redeploy the frontend. The dashboard should switch from demo mode to live mode when `/depot/schedule` returns a valid response.

## Quick Checks

After backend deployment:

```text
https://your-backend-url/health
https://your-backend-url/depot/carbon_signal
```

After frontend redeploy, open the dashboard and press `Run Schedule`. If it says `Live API connected`, the deployed frontend is using the backend.
