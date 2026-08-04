from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(r"C:\Users\Coding\AppData\Local\Temp\codex-clipboard-bd968c81-0f7f-41e4-9117-9ea2136f971c.png")
RENDER=ROOT/".runtime"/"phase-a-layout-render"/"page-1.png"
OUTPUT=ROOT/"artifacts"/"phase-a-side-by-side.png"


def vertical_metrics(path):
    image=Image.open(path).convert("L")
    width,height=image.size
    pixels=image.load()
    rows=[]
    for y in range(height):
        ink=sum(1 for x in range(int(width*.025),int(width*.975)) if pixels[x,y]<225)
        if ink>=max(2,int(width*.003)):
            rows.append(y)
    main=[row for row in rows if row<height*.86]
    footer=[row for row in rows if row>=height*.86]
    return {
        "main_bottom_ratio":max(main)/height,
        "main_height_ratio":(max(main)-min(main))/height,
        "footer_top_ratio":min(footer)/height,
        "lower_whitespace_ratio":(min(footer)-max(main))/height,
    }


def main():
    source=Image.open(SOURCE).convert("RGB")
    render=Image.open(RENDER).convert("RGB")
    target_height=max(source.height,render.height)
    source=source.resize((round(source.width*target_height/source.height),target_height),Image.Resampling.LANCZOS)
    render=render.resize((round(render.width*target_height/render.height),target_height),Image.Resampling.LANCZOS)
    gap=28;label_height=52
    canvas=Image.new("RGB",(source.width+render.width+gap,target_height+label_height),(242,244,248))
    canvas.paste(source,(0,label_height));canvas.paste(render,(source.width+gap,label_height))
    draw=ImageDraw.Draw(canvas)
    font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf",24)
    draw.text((16,12),"SOURCE SCAN",fill=(31,41,55),font=font)
    draw.text((source.width+gap+16,12),"PHASE A HYBRID DOCX",fill=(31,41,55),font=font)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    canvas.save(OUTPUT)

    source_metrics=vertical_metrics(SOURCE);render_metrics=vertical_metrics(RENDER)
    assert abs(render_metrics["main_height_ratio"]-source_metrics["main_height_ratio"])<=.12
    assert render_metrics["lower_whitespace_ratio"]<=source_metrics["lower_whitespace_ratio"]+.08
    print(json.dumps({"source":source_metrics,"render":render_metrics,"comparison":str(OUTPUT)},indent=2))


if __name__=="__main__":
    main()
