import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image

# Define the same model structure used during training
class MaizeModel(nn.Module):
    def __init__(self):
        super(MaizeModel, self).__init__()
        # Example structure – update this to match your model
        self.net = nn.Sequential(
            nn.Conv2d(3, 16, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Flatten(),
            nn.Linear(16 * 112 * 112, 2)  # adjust to your model’s output
        )

    def forward(self, x):
        return self.net(x)

# Load model function
def load_model(model_path="maize_model.pth"):
    model = MaizeModel()
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()
    return model

# Preprocessing + prediction
def predict_image(model, image_path):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ])
    image = Image.open(image_path).convert("RGB")
    img_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        outputs = model(img_tensor)
        _, predicted = torch.max(outputs, 1)
    return predicted.item()
