import os
import math
from PIL import Image

def color_distance(c1, c2):
    return math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2)

# La paleta exacta y pura extraída directamente de la imagen
PALETTE = {
    "bg": (252, 251, 246),       # Blanco del fondo
    "shadow": (215, 212, 207),   # Gris de la sombra original
    "halo": (150, 150, 150),     # Grises del halo
    "outline": (11, 32, 85),     # Azul noche (borde exacto)
    "dark_blue": (28, 104, 190), # Sombra del cuerpo exacta
    "mid_blue": (57, 144, 223),  # Cuerpo exacto
    "light_blue": (145, 213, 250)# Brillo exacto (¡Este es el que se perdió!)
}

def process_totorito_hq():
    input_path = r"C:\Users\valen\.gemini\antigravity\brain\ff986b7f-f7a5-46d8-a7da-59b9186dbf19\.user_uploaded\media_1789899298658.jpg"
    out_dir = r"c:\Users\valen\Documents\proyecto-bir\public"
    
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # 1. Encontrar el recuadro (quitando el libro abajo a la derecha)
    min_x, max_x = width, 0
    min_y, max_y = height, 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            is_blue = b > r + 20 and b > g + 10
            is_black = r < 50 and g < 50 and b < 50
            if is_black and x > width * 0.75 and y > height * 0.75:
                continue
            if is_blue or is_black:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    # Le damos 2 px de margen
    cropped = img.crop((max(0, min_x-2), max(0, min_y-2), min(width, max_x+2), min(height, max_y+2)))
    c_w, c_h = cropped.size
    
    final_data = []
    
    # 2. Restauración del Pixel Art (Cuantización a paleta estricta)
    for y in range(c_h):
        for x in range(c_w):
            r, g, b, a = cropped.getpixel((x, y))
            pixel = (r, g, b)
            
            closest_name = None
            min_dist = 999999
            
            for name, p_color in PALETTE.items():
                dist = color_distance(pixel, p_color)
                # Bias brutal hacia el fondo/halo para asegurar que los píxeles sucios desaparezcan y no muerdan el negro
                if name in ["bg", "shadow", "halo"]:
                    dist -= 60 
                    
                if dist < min_dist:
                    min_dist = dist
                    closest_name = name
                    
            if closest_name in ["bg", "shadow", "halo"]:
                final_data.append((0, 0, 0, 0)) # Transparente absoluto
            elif closest_name == "outline":
                final_data.append(PALETTE["outline"] + (255,))
            elif closest_name == "dark_blue":
                final_data.append(PALETTE["dark_blue"] + (255,))
            elif closest_name == "mid_blue":
                final_data.append(PALETTE["mid_blue"] + (255,))
            elif closest_name == "light_blue":
                final_data.append(PALETTE["light_blue"] + (255,))
                
    cropped.putdata(final_data)
    
    # Guardar la versión HD Transparente
    img_path = os.path.join(out_dir, "images", "totorito.png")
    cropped.save(img_path, "PNG")
    print("Totorito HD Restaurado y guardado.")
    
    # 3. Regenerar Iconos (escalado NEAREST para no emborronar NADA)
    bg_color = (11, 17, 32, 255)
    def create_icon(size):
        icon = Image.new("RGBA", (size, size), bg_color)
        target_w = int(size * 0.8)
        ratio = target_w / c_w
        target_h = int(c_h * ratio)
        
        # El secreto está en Image.NEAREST (los píxeles se multiplican como bloques, no se difuminan)
        resized = cropped.resize((target_w, target_h), Image.NEAREST)
        
        offset_x = (size - target_w) // 2
        offset_y = (size - target_h) // 2
        icon.paste(resized, (offset_x, offset_y), resized)
        return icon

    icon512 = create_icon(512)
    icon192 = create_icon(192)
    icon512.save(os.path.join(out_dir, "icons", "icon-512x512.png"), "PNG")
    icon192.save(os.path.join(out_dir, "icons", "icon-192x192.png"), "PNG")
    print("Iconos regenerados con píxeles afilados.")

if __name__ == "__main__":
    process_totorito_hq()
