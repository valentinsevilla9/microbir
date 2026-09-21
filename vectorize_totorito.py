import os
from PIL import Image

def rebuild_pixel_art():
    # Ruta de la nueva imagen con el fondo de cuadraditos
    input_path = r"C:\Users\valen\.gemini\antigravity\brain\ff986b7f-f7a5-46d8-a7da-59b9186dbf19\.user_uploaded\media_1789902141546.jpg"
    out_dir = r"c:\Users\valen\Documents\proyecto-bir\public\images"
    
    img = Image.open(input_path).convert("RGB")
    width, height = img.size
    
    # 1. ENCONTRAR EL TAMAÑO DEL PÍXEL (Grid Size)
    # Buscamos un píxel negro del contorno y medimos su anchura.
    # Recorremos la imagen buscando el primer píxel negro claro.
    block_size = 1
    for y in range(height):
        found = False
        for x in range(width):
            r, g, b = img.getpixel((x, y))
            if r < 30 and g < 30 and b < 50: # Es negro/azul muy oscuro
                # Medir cuántos píxeles seguidos son del mismo color para sacar el block_size
                start_x = x
                while x < width:
                    r2, g2, b2 = img.getpixel((x, y))
                    if r2 < 50 and g2 < 50 and b2 < 70:
                        x += 1
                    else:
                        break
                length = x - start_x
                if 5 < length < 50: # Asumimos que un píxel del pixel art mide entre 5 y 50 píxeles reales
                    block_size = length
                    found = True
                    break
        if found:
            break
            
    print(f"Tamaño de bloque detectado: {block_size} px")
    
    # Afinamos un poco el block size si detectamos que la imagen tiene algo de ruido
    # (En la imagen proporcionada parece que los píxeles rondan los 12-16 px de tamaño).
    # Para ser seguros, voy a hacer un downsample agresivo con NEAREST.
    
    # El tamaño original de tu pixel art parece ser de unos 64x64 celdas aproximadamente.
    grid_w = width // block_size
    grid_h = height // block_size
    print(f"Cuadrícula estimada: {grid_w} x {grid_h}")
    
    # Vamos a usar la técnica matemática que propuso el usuario:
    # Muestrear el CENTRO de cada celda para evitar los bordes sucios del JPG.
    
    # Colores puros a los que vamos a forzar
    PALETTE = {
        "outline": (11, 32, 85),     # Borde
        "dark_blue": (28, 104, 190), # Sombra
        "mid_blue": (57, 144, 223),  # Cuerpo
        "light_blue": (145, 213, 250)# Brillo
    }
    
    def color_distance(c1, c2):
        return (c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2

    # Creamos un lienzo nuevo del tamaño de la cuadrícula
    clean_grid = Image.new("RGBA", (grid_w, grid_h), (0,0,0,0))
    
    for gy in range(grid_h):
        for gx in range(grid_w):
            # Centro matemático del bloque
            cx = (gx * block_size) + (block_size // 2)
            cy = (gy * block_size) + (block_size // 2)
            
            if cx >= width or cy >= height: continue
                
            r, g, b = img.getpixel((cx, cy))
            
            # Si el color es grisáceo o blanquecino, es el falso PNG (cuadraditos). Transparente.
            # Los cuadraditos de los falsos PNG son grises (ej. 200,200,200) y blancos (255,255,255)
            # También ignoramos tonos que no sean claramente parte del muñeco.
            if (r > 160 and g > 160 and b > 160) or (abs(r-g)<15 and abs(g-b)<15 and r > 100):
                continue # Transparente
                
            # Si tiene color, lo forzamos al más cercano de nuestra paleta limpia
            pixel = (r, g, b)
            min_dist = 999999
            best_color = None
            for name, c in PALETTE.items():
                d = color_distance(pixel, c)
                if d < min_dist:
                    min_dist = d
                    best_color = c
            
            # Solo pintamos si se parece a la paleta (distancia razonable)
            if min_dist < 8000: # Tolerancia amplia porque estamos en el centro del píxel puro
                clean_grid.putpixel((gx, gy), best_color + (255,))

    # Ahora clean_grid es un pixel art PERFECTO y enano (ej: 40x30 píxeles).
    # Lo ampliamos al tamaño original usando NEAREST (multiplica los cuadrados enteros).
    perfect_totorito = clean_grid.resize((grid_w * block_size, grid_h * block_size), Image.NEAREST)
    
    # 4. Encontrar Bounding Box en el pixel art limpio y recortarlo
    bbox = perfect_totorito.getbbox()
    if bbox:
        perfect_totorito = perfect_totorito.crop(bbox)
    
    os.makedirs(out_dir, exist_ok=True)
    img_path = os.path.join(out_dir, "totorito.png")
    perfect_totorito.save(img_path, "PNG")
    print("¡Totorito recreado desde cero con éxito!")

    # EXTRA: Generar un archivo SVG perfecto
    svg_path = os.path.join(out_dir, "totorito.svg")
    # Para el SVG iteramos sobre el grid limpio
    c_bbox = clean_grid.getbbox()
    if c_bbox:
        c_clean = clean_grid.crop(c_bbox)
        sw, sh = c_clean.size
        svg_content = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {sw} {sh}" shape-rendering="crispEdges">']
        for y in range(sh):
            for x in range(sw):
                r, g, b, a = c_clean.getpixel((x, y))
                if a == 255:
                    hex_color = f"#{r:02x}{g:02x}{b:02x}"
                    svg_content.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{hex_color}"/>')
        svg_content.append('</svg>')
        
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(svg_content))
        print("SVG Vectorial de calidad infinita creado con éxito.")

if __name__ == "__main__":
    rebuild_pixel_art()
