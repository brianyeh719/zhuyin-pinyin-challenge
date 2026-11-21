"""
產生「雙拼積木實驗桌」的整音節（含聲調）音檔 → public/audio/syllable/<注音><聲調>.mp3
例：ㄋㄞ + 三聲 → public/audio/syllable/ㄋㄞ3.mp3；輕聲則為 ㄇㄚ5.mp3（唸示範詞「媽媽」）

用法：
  pip install edge-tts
  python tools/generate-syllable-audio.py
產生後把 src/audio/soundEngine.js 的 USE_SYLLABLE_AUDIO_FILES 改成 true。
建議逐一聽過；不標準的字改 src/data/syllableData.js 的代表字再重跑，或用真人錄音覆蓋同名 mp3。
"""
import asyncio, re, pathlib
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = (ROOT / "src/data/syllableData.js").read_text(encoding="utf-8")
OUT = ROOT / "public/audio/syllable"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "zh-TW-HsiaoChenNeural"
RATE = "-20%"

rows = re.findall(r"^  '([^']+)': \[((?:'[^']*'(?:, )?){5})\],$", SRC, re.M)
assert len(rows) > 200, len(rows)

async def main():
    n = 0
    for key, cells in rows:
        for tone, text in enumerate(re.findall(r"'([^']*)'", cells), 1):
            if not text:
                continue
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(OUT / f"{key}{tone}.mp3"))
            n += 1
            print(f"{key}{tone} → {text}")
    print("完成", n, "個音檔")

asyncio.run(main())
