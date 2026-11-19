"""
產生 37 個注音符號的標準發音音檔 → public/audio/zhuyin/<id>.mp3
使用微軟 Edge 神經網路語音 zh-TW-HsiaoChenNeural（免 API 金鑰）。

用法：
  pip install edge-tts
  python tools/generate-zhuyin-audio.py

產生後請「逐一聽過」；若某個音不標準，改下方 OVERRIDE（換例字或用詞語）再重跑，
或直接用真人錄音覆蓋同名 mp3（建議，最標準）。
"""
import asyncio, re, pathlib
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = (ROOT / "src/data/zhuyinData.js").read_text(encoding="utf-8")
OUT = ROOT / "public/audio/zhuyin"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "zh-TW-HsiaoChenNeural"
RATE = "-25%"  # 放慢，利於初學者聽辨

# 單字 TTS 容易讀錯破音字／語調；用「固定一聲、單一讀音的詞」帶出該音，再視需要調整
OVERRIDE = {
    "ㄝ": "ㄝ，耶",     # 原本與 ㄟ 同為「欸」，無法區分
    "ㄟ": "誒，ㄟ",
    "ㄈ": "ㄈㄛ，佛",
    "ㄉ": "ㄉㄜ，德",   # 「得」是破音字
    "ㄌ": "ㄌㄜ，樂",
}

# 每個符號以 id 為單位解析（ㄝ 的資料跨多行，所以要用 DOTALL）
entries = re.findall(
    r"id: '(gold\d+)'.*?zhuyin: '(.+?)'.*?audioText: '(.+?)'", SRC, re.DOTALL
)
assert len(entries) == 37, len(entries)

async def main():
    for gid, zy, audio in entries:
        text = OVERRIDE.get(zy, audio)
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(OUT / f"{gid}.mp3"))
        print(gid, zy, "→", text)

asyncio.run(main())
