import os
from PIL import Image

# 1. Source image paths (the generated artifacts)
source_images = {
    "monstera": "/Users/cathyp/.gemini/antigravity/brain/da9a8c29-32c1-4252-9fbd-e5c44687370f/monstera_pixel_1779904153233.png",
    "succulent": "/Users/cathyp/.gemini/antigravity/brain/da9a8c29-32c1-4252-9fbd-e5c44687370f/succulent_pixel_1779904167521.png",
    "fern": "/Users/cathyp/.gemini/antigravity/brain/da9a8c29-32c1-4252-9fbd-e5c44687370f/fern_pixel_1779904183845.png",
    "cactus": "/Users/cathyp/.gemini/antigravity/brain/da9a8c29-32c1-4252-9fbd-e5c44687370f/cactus_pixel_1779904201922.png"
}

# 2. Output directory
output_dir = "/Users/cathyp/.gemini/antigravity/scratch/smart-plant-care/frontend/src/assets"
os.makedirs(output_dir, exist_ok=True)

def make_transparent(source_path, target_path):
    print(f"Processing {os.path.basename(source_path)}...")
    img = Image.open(source_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # If the pixel is very close to white, make it transparent
        r, g, b, a = item
        if r > 248 and g > 248 and b > 248:
            new_data.append((0, 0, 0, 0)) # Fully transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(target_path, "PNG")
    print(f"✅ Saved transparent sprite to {target_path}")

for name, path in source_images.items():
    target = os.path.join(output_dir, f"{name}_pixel.png")
    make_transparent(path, target)
print("🎉 All sprites successfully processed!")
