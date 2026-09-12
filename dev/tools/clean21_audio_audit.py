from pathlib import Path
import re

ROOT=Path('dev')
terms=['AUDIO_SETTINGS_KEY','defaultAudioSettings','audioSettings','openAudioMixer','closeAudioMixer','loadAudioSettings','saveAudioSettings','updateAudioLabel','playSound','testAuctionAudio','speakBidValue','testBidVoice','speakFinalCountdownNumber','playAuctionFinalCountdown','testFinalCountdownAudio']
files=[p for p in ROOT.rglob('*') if p.is_file() and p.suffix in {'.js','.html'}]
out=['LIVEASTA CLEAN-21 - AUDIO DEPENDENCY AUDIT','========================================','']
for term in terms:
    out.append(f'[{term}]')
    rx=re.compile(r'\b'+re.escape(term)+r'\b')
    hits=[]
    for p in files:
        if 'CLEANUP_' in p.name or 'tools' in p.parts or 'tests' in p.parts: continue
        try: lines=p.read_text(encoding='utf-8').splitlines()
        except: continue
        for i,line in enumerate(lines,1):
            if rx.search(line): hits.append(f'{p}:{i}: {line.strip()}')
    out.extend(hits or ['(none)'])
    out.append('')
Path('dev/CLEANUP_AUDIT_CLEAN21_AUDIO.txt').write_text('\n'.join(out),encoding='utf-8')
