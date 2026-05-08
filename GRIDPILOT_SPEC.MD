# GridPilot — Complete System Specification
**Version:** 1.0  
**Campus:** Corporate EV Fleet Depot, Gurugram
**Stack:** Python, CVXPY, pandapower, Prophet, FastAPI, Streamlit  
**Backend engine:** FirstFlight (internal, powers carbon signals)  
**Status:** Build from scratch, complete working product

---

## PRODUCT IDENTITY

**GridPilot** is a grid-edge EV charging orchestration platform for 
Indian campuses. It prevents transformer overloads, minimizes carbon 
emissions, and coordinates 500 EVs using a convex quadratic optimizer.

**FirstFlight** is the backend national grid intelligence engine. 
It is never marketed. It provides carbon intensity signals and 
regional demand forecasts that GridPilot's scheduler consumes.

**Demo scenario:** Corporate EV Fleet Depot, Gurugram  
- 500 EVs (100% four-wheelers: Tata Nexon EV, 40 kWh, 7.4kW charger)  
- Sanctioned load: 5000 kVA  
- DVVNL Limit: 4500 kW
- Transformer limit: 4000 kW
- Arrival window: 22:00 - 01:00 (post evening shift)
- Departure deadline: 06:00 (morning shift dispatch)
- Energy needed: 60-80% charge (drivers return at 15-25% SoC)

- Tariff: DVVNL HT-2 Gurugram  
- Demand charge: ₹350/kVA/month  
- Peak penalty rate: ₹500/kVA/month  
- Connection: DVVNL (Dakshinanchal Vidyut Vitaran Nigam Limited)

- State: Uttar Pradesh/Haryana border (Gurugram)
- CEA emission factor: 0.820 kg CO2/kWh (Delhi/NCR grid — highest in India, heavily coal dependent)
- Clean window: 02:00-05:00 (lowest demand, marginally cleaner)

**Financial numbers**
- Monthly DVVNL demand charge saving: ₹8-12 lakh
- Daily operational saving: ₹26,000-40,000
- Unmanaged peak load: ~3,700 kW (500 × 7.4kW)
- GridPilot managed peak: target ~2,000 kW flat across 8 hours
- Overload events without GridPilot: severe — transformer at 185% rated capacity

**Company context**
Corporate Fleet Operator is India's largest all-electric cab fleet.
8,000+ EVs operating in Delhi-NCR and Bangalore.
Publicly reported transformer stress at Gurugram depot.
No intelligent charging orchestration currently deployed.
GridPilot directly addresses their documented pain point.
