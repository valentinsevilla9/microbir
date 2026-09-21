import sys
import os
from PIL import Image, ImageDraw

def process_totorito():
    # Rutas
    input_path = r"C:\Users\valen\.gemini\antigravity\brain\ff986b7f-f7a5-46d8-a7da-59b9186dbf19\.user_uploaded\media_1789899298658.jpg"
    out_dir = r"c:\Users\valen\Documents\proyecto-bir\public"
    
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    width, height = img.size
    
    new_data = []
    
    # Heurística simple: Totorito es AZUL y NEGRO. El fondo es BLANCO/CREMA, la sombra es GRIS, el libro tiene líneas grises/negras pero está abajo a la derecha.
    # Vamos a buscar la caja delimitadora (bounding box) de Totorito.
    
    # 1. Encontrar los límites aproximados del azul/negro para recortar la marca de agua y la sombra
    # Totorito tiene mucho azul.
    min_x, max_x = width, 0
    min_y, max_y = height, 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            # Identificar colores del tardígrado (azules y el negro del borde)
            # Descartamos grises puros (sombra) y blancos (fondo)
            is_blue = b > r + 20 and b > g + 10 # Es azulado
            is_black = r < 50 and g < 50 and b < 50 # Es negro
            
            # Evitar el libro (está en la esquina inferior derecha, cortamos la búsqueda ahí)
            if is_black and x > width * 0.8 and y > height * 0.8:
                continue
                
            if is_blue or is_black:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y

    # Ajuste manual rápido por si acaso la heurística se pasó un poco por la sombra negra de los pies
    # Recortamos la imagen exactamente al bounding box de Totorito
    totorito_cropped = img.crop((min_x, min_y, max_x, max_y))
    c_width, c_height = totorito_cropped.size
    
    # 2. Quitar fondo. Recorremos el crop. Cualquier cosa que sea blanquecina/grisácea clara se vuelve transparente.
    # Como es un JPG, usamos tolerancia.
    final_data = []
    for y in range(c_height):
        for x in range(c_width):
            r, g, b, a = totorito_cropped.getpixel((x, y))
            # Si es muy claro (fondo crema) o es grisáceo (resto de la sombra bajo los pies)
            # Y NO es azul
            if r > 200 and g > 200 and b > 200:
                final_data.append((0, 0, 0, 0)) # Transparente
            elif abs(r-g) < 15 and abs(g-b) < 15 and r > 150: # Grises claros de la sombra
                final_data.append((0, 0, 0, 0)) # Transparente
            else:
                # Limpiar los negros para que sean negros puros (JPG artifacts)
                if r < 60 and g < 60 and b < 60:
                    final_data.append((11, 17, 32, 255)) # Mismo negro/azul muy oscuro del contorno
                else:
                    final_data.append((r, g, b, 255))
                    
    totorito_cropped.putdata(final_data)
    
    # 3. Guardar el transparente original
    img_path = os.path.join(out_dir, "images", "totorito.png")
    os.makedirs(os.path.dirname(img_path), exist_ok=True)
    totorito_cropped.save(img_path, "PNG")
    print("Guardado: " + img_path)
    
    # 4. Crear los iconos cuadrados (512x512 y 192x192) con fondo #0B1120
    bg_color = (11, 17, 32, 255) # Hex #0B1120 a RGB
    
    def create_icon(size):
        icon = Image.new("RGBA", (size, size), bg_color)
        # Redimensionar a Totorito para que quepa bien (dejando un 20% de margen)
        target_w = int(size * 0.8)
        # Proporción
        ratio = target_w / c_width
        target_h = int(c_height * ratio)
        
        resized_totorito = totorito_cropped.resize((target_w, target_h), Image.NEAREST)
        
        # Centrar
        offset_x = (size - target_w) // 2
        offset_y = (size - target_h) // 2
        
        icon.paste(resized_totorito, (offset_x, offset_y), resized_totorito)
        return icon

    icon512 = create_icon(512)
    icon192 = create_icon(192)
    
    os.makedirs(os.path.join(out_dir, "icons"), exist_ok=True)
    icon512.save(os.path.join(out_dir, "icons", "icon-512x512.png"), "PNG")
    icon192.save(os.path.join(out_dir, "icons", "icon-192x192.png"), "PNG")
    print("Iconos creados con éxito.")

if __name__ == "__main__":
    process_totorito()
