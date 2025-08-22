from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
import asyncio
from datetime import datetime

from models.market_predictor import MarketPredictor
from models.yield_optimizer import YieldOptimizer
from services.data_service import DataService
from services.real_time_analyzer import RealTimeAnalyzer
from config import settings

app = FastAPI(
    title="DefiBrain AI Backend",
    description="AI/ML backend service for DefiBrain DeFi platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://defibrain.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
market_predictor = MarketPredictor()
yield_optimizer = YieldOptimizer()
data_service = DataService()
real_time_analyzer = RealTimeAnalyzer()

# Pydantic models
class PredictionRequest(BaseModel):
    tokens: List[str]
    timeframe: str = "1h"
    horizon: int = 24

class OptimizationRequest(BaseModel):
    portfolio_value: float
    risk_tolerance: str
    protocols: List[str]
    current_positions: Dict[str, float]

class MarketAnalysisRequest(BaseModel):
    tokens: List[str]
    include_sentiment: bool = True
    include_technical: bool = True

@app.on_event("startup")
async def startup_event():
    """Initialize AI models and services on startup"""
    await market_predictor.initialize()
    await yield_optimizer.initialize()
    await data_service.initialize()
    await real_time_analyzer.start()
    print("AI Backend services initialized successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await real_time_analyzer.stop()
    print("AI Backend services shut down")

@app.get("/")
async def root():
    return {"message": "DefiBrain AI Backend is running", "timestamp": datetime.now()}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "market_predictor": market_predictor.is_ready(),
            "yield_optimizer": yield_optimizer.is_ready(),
            "data_service": data_service.is_ready(),
            "real_time_analyzer": real_time_analyzer.is_running()
        }
    }

@app.post("/api/v1/predict/prices")
async def predict_prices(request: PredictionRequest):
    """Predict token prices using ML models"""
    try:
        predictions = await market_predictor.predict_prices(
            tokens=request.tokens,
            timeframe=request.timeframe,
            horizon=request.horizon
        )
        return {
            "predictions": predictions,
            "confidence": await market_predictor.get_confidence_scores(request.tokens),
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/optimize/yield")
async def optimize_yield(request: OptimizationRequest):
    """Optimize yield allocation using deep learning"""
    try:
        optimization = await yield_optimizer.optimize_allocation(
            portfolio_value=request.portfolio_value,
            risk_tolerance=request.risk_tolerance,
            protocols=request.protocols,
            current_positions=request.current_positions
        )
        return {
            "optimization": optimization,
            "expected_apy": optimization.get("expected_apy"),
            "risk_score": optimization.get("risk_score"),
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analyze/market")
async def analyze_market(request: MarketAnalysisRequest):
    """Real-time market analysis with sentiment and technical indicators"""
    try:
        analysis = await real_time_analyzer.analyze_market(
            tokens=request.tokens,
            include_sentiment=request.include_sentiment,
            include_technical=request.include_technical
        )
        return {
            "analysis": analysis,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/insights/portfolio/{address}")
async def get_portfolio_insights(address: str):
    """Get AI-powered portfolio insights"""
    try:
        insights = await yield_optimizer.generate_portfolio_insights(address)
        return {
            "insights": insights,
            "recommendations": insights.get("recommendations", []),
            "risk_analysis": insights.get("risk_analysis", {}),
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/data/protocols")
async def get_protocol_data():
    """Get current DeFi protocol data"""
    try:
        data = await data_service.get_protocol_data()
        return {
            "protocols": data,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )