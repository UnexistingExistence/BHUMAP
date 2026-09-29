# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, Boolean
# pyrefly: ignore [missing-import]
from geoalchemy2 import Geometry
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Parcel(Base):
    __tablename__ = "parcels"

    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(String, unique=True, index=True)
    owner = Column(String)
    area_sqm = Column(Float)
    
    # The crucial spatial column! 
    # SRID 4326 is the standard coordinate system for GPS (Longitude/Latitude)
    geom = Column(Geometry('POLYGON', srid=4326))