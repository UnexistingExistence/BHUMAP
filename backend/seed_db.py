from database import SessionLocal
from models import Parcel

def seed_database():
    db = SessionLocal()
    
    try:
        # Check if we already have data to prevent duplicates
        if db.query(Parcel).first():
            print("Database already seeded!")
            return

        print("Inserting real spatial data into PostGIS...")

        # Create a new parcel object
        # The geom field expects WKT (Well-Known Text) format
        new_parcel = Parcel(
            parcel_id="DEL-URB-TEST1",
            owner="Hackathon User",
            area_sqm=450.5,
            # This is WKT for a simple polygon in New Delhi
            geom="POLYGON((77.2085 28.6135, 77.2092 28.6135, 77.2092 28.6142, 77.2085 28.6142, 77.2085 28.6135))"
        )
        
        db.add(new_parcel)
        db.commit()
        print("Success! Geographic polygon inserted into PostGIS.")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()