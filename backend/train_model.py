# pyrefly: ignore [missing-import]
from ultralytics import YOLO

def train_custom_model():
    print("Initializing YOLOv8 custom training pipeline...")
    
    # Load the pre-trained segmentation model as our starting point
    model = YOLO("yolov8n.pt")
    
    # Start training! 
    results = model.train(
        data="datasets/aerial_mapping/data.yaml", # UPDATED: Pointing to the Kaggle yaml
        epochs=30,             # Reduced to 30 for a faster initial hackathon prototype
        imgsz=640,             # Image size to train on
        batch=4,               # UPDATED: Dropped to 4 to protect your RTX 2050 VRAM
        workers=2,             # UPDATED: Helps load images into the GPU efficiently
        device=0,              # Force CUDA / GPU acceleration
        name="sih26012_aerial_model", # Name of the output folder
        project="training_runs"
    )
    
    print("Training complete! The new model is saved in the 'training_runs' folder.")

if __name__ == "__main__":
    train_custom_model()