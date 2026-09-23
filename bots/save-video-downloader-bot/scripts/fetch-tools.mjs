/**
 * yt-dlp / gallery-dl / ffmpeg binarlarini bin/ ga yuklaydi.
 *
 * Nega skript, nega bir qatorli shell emas:
 *   1. Avval amd64 binarlari QATTIQ yozilgan edi. ARM mashinada (Raspberry Pi,
 *      aarch64 telefon, Apple Silicon VM) ular yuklanardi, lekin ishlamasdi.
 *   2. curl HTML xato sahifasini yuklab olsa ham, keyingi buyruq ishlayverardi
 *      va xato "xz: File format not recognized" bo'lib chiqardi — sabab
 *      ko'rinmasdi.
 *
 * Bu skript o'rnatishni YIQITMAYDI: src/config.js binarlarni env > bin/ >
 * PATH tartibida qidiradi, shuning uchun yuklab bo'lmasa ham tizimdagi
 * `apt install`dan kelgan nusxa ishlatiladi. Yuklab bo'lmagani esa
 * ko'rinadigan qilib yoziladi.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const binDir = join(here, '..', 'bin')

const ARCH = process.arch // 'x64' | 'arm64' | ...
const ogohlantirishlar = []

/** Yuklangan fayl haqiqatan kutilgan turdami — hajmi va sehrli baytlari bo'yicha. */
function tekshir(fayl, { minBayt, magic }) {
  const hajm = statSync(fayl).size
  if (hajm < minBayt) {
    throw new Error(`hajmi juda kichik (${hajm} bayt) — ehtimol xato sahifasi yuklangan`)
  }
  if (magic) {
    const bosh = readFileSync(fayl).subarray(0, magic.length)
    if (!bosh.equals(Buffer.from(magic))) {
      throw new Error('fayl formati kutilganidan boshqa')
    }
  }
}

function yukla(url, chiqish) {
  const r = spawnSync('curl', ['-fL', '--retry', '2', '--max-time', '300', url, '-o', chiqish], {
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  if (r.status !== 0) throw new Error(`curl xatosi (kod ${r.status})`)
}

function tizimda(nom) {
  return spawnSync('sh', ['-c', `command -v ${nom}`], { stdio: 'ignore' }).status === 0
}

function oling(nom, { url, chiqish, minBayt, magic, keyin }) {
  if (!url) {
    ogohlantirishlar.push(`${nom}: ${ARCH} uchun tayyor binar yo'q`)
    return
  }
  try {
    console.log(`  ↓ ${nom} (${ARCH})`)
    yukla(url, chiqish)
    tekshir(chiqish, { minBayt, magic })
    if (keyin) keyin()
    else chmodSync(chiqish, 0o755)
    console.log(`  ✅ ${nom}`)
  } catch (e) {
    rmSync(chiqish, { force: true })
    ogohlantirishlar.push(`${nom}: ${e.message}`)
    console.log(`  ⚠️  ${nom} yuklanmadi — ${e.message}`)
  }
}

mkdirSync(binDir, { recursive: true })
console.log(`\nVositalar yuklanmoqda (arxitektura: ${ARCH})`)

// --- yt-dlp -----------------------------------------------------------------
const YTDLP = {
  x64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
  arm64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64',
}
oling('yt-dlp', { url: YTDLP[ARCH], chiqish: join(binDir, 'yt-dlp'), minBayt: 1_000_000 })

// --- gallery-dl (ixtiyoriy) -------------------------------------------------
// Rasmiy binar faqat x86_64 uchun chiqariladi.
const GALLERY = {
  x64: 'https://codeberg.org/mikf/gallery-dl/releases/download/v1.32.5/gallery-dl.bin',
}
if (!GALLERY[ARCH] && tizimda('gallery-dl')) {
  console.log('  ✅ gallery-dl — tizimda topildi')
} else {
  oling('gallery-dl', { url: GALLERY[ARCH], chiqish: join(binDir, 'gallery-dl'), minBayt: 1_000_000 })
}

// --- ffmpeg + ffprobe -------------------------------------------------------
if (tizimda('ffmpeg') && tizimda('ffprobe')) {
  console.log('  ✅ ffmpeg/ffprobe — tizimda topildi, yuklab o\'tirilmadi')
} else {
  const FFMPEG = {
    x64: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
    arm64: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz',
  }
  const arxiv = join(binDir, '.ffmpeg.tar.xz')
  oling('ffmpeg', {
    url: FFMPEG[ARCH],
    chiqish: arxiv,
    minBayt: 10_000_000,
    magic: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], // .xz sehrli baytlari
    keyin() {
      const r = spawnSync('sh', ['-c',
        `tar -xJf "${arxiv}" -C "${binDir}" --strip-components=1 --wildcards '*/ffmpeg' '*/ffprobe'`,
      ], { stdio: 'inherit' })
      rmSync(arxiv, { force: true })
      if (r.status !== 0) throw new Error('arxivni ochib bo\'lmadi')
      chmodSync(join(binDir, 'ffmpeg'), 0o755)
      chmodSync(join(binDir, 'ffprobe'), 0o755)
    },
  })
}

if (ogohlantirishlar.length) {
  console.log('\n⚠️  Ba\'zi vositalar yuklanmadi:')
  for (const w of ogohlantirishlar) console.log(`   • ${w}`)
  console.log(
    '\n   Bot ularni tizimdan ham topa oladi. O\'rnatish uchun:\n' +
    '     sudo apt install -y ffmpeg\n' +
    '     pip install yt-dlp gallery-dl\n' +
    '   Yoki .env da YTDLP_PATH / FFMPEG_PATH / GALLERY_DL_PATH ni ko\'rsating.\n',
  )
} else {
  console.log('\n✅ Barcha vositalar tayyor.\n')
}

// O'rnatishni ataylab yiqitmaymiz — qolgan 12 ta bot ham o'rnatilishi kerak.
process.exit(0)
