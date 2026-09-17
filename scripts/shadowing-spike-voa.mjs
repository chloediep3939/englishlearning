// S0.5 spike — probe VOA Learning English ingest pipeline (RSS → bài → MP3 +
// transcript), KHÔNG dùng thư viện ngoài (chỉ global fetch của Node 18+).
// Mục tiêu: trả lời "script tải bài VOA chạy được không" trước khi viết
// scripts/ingest-voa.ts thật (S1, cần thêm STT lấy mốc từng từ).
//
// Cách chạy:
//   node scripts/shadowing-spike-voa.mjs "<RSS_URL>"
//
// KHÔNG hardcode URL feed vì mình chưa verify endpoint VOA (kế hoạch §9).
// Bạn dán URL RSS của một chương trình (vd English in a Minute) vào để thử.
//
// Kết quả cần soi:
//   - fetch RSS có bị chặn (403/bot) không → nếu chặn, cần header/UA khác
//   - mỗi <item> có link MP3 (<enclosure>) và link trang bài không
//   - thử tải 1 trang bài xem có transcript nhúng không

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const rssUrl = process.argv[2];
if (!rssUrl) {
  console.error('Thiếu URL. Dùng: node scripts/shadowing-spike-voa.mjs "<RSS_URL>"');
  process.exit(1);
}

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  const text = await res.text();
  return { status: res.status, ok: res.ok, contentType: res.headers.get('content-type'), text };
}

function pick(re, s) {
  const m = re.exec(s);
  return m ? m[1] : null;
}

async function main() {
  console.log('== RSS ==', rssUrl);
  const rss = await get(rssUrl);
  console.log('status:', rss.status, '| content-type:', rss.contentType, '| bytes:', rss.text.length);
  if (!rss.ok) {
    console.log('⚠️ RSS bị chặn hoặc lỗi — có thể cần header khác. Đầu phản hồi:');
    console.log(rss.text.slice(0, 400));
    return;
  }

  // Tách <item> thô bằng regex (spike, không cần parser XML đúng chuẩn).
  const items = rss.text.split(/<item[\s>]/i).slice(1).map((chunk) => '<item ' + chunk);
  console.log('số <item>:', items.length);

  const sample = items.slice(0, 3).map((it) => ({
    title: pick(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is, it),
    link: pick(/<link>(.*?)<\/link>/is, it),
    enclosure: pick(/<enclosure[^>]*url="([^"]+\.mp3[^"]*)"/i, it),
  }));
  console.log('3 item đầu:');
  for (const s of sample) console.log('  -', JSON.stringify(s));

  const first = sample.find((s) => s.link);
  if (first?.link) {
    console.log('\n== Trang bài đầu ==', first.link);
    const page = await get(first.link);
    console.log('status:', page.status, '| bytes:', page.text.length);
    // Đoán khối transcript: nhiều bài VOA để trong div có class chứa "transcript"
    // hoặc "wsw" (article body). Chỉ báo có/không, không parse kỹ ở spike.
    const hasTranscriptHint = /transcript|wsw|article-body|\bintro\b/i.test(page.text);
    console.log('có gợi ý transcript trong HTML:', hasTranscriptHint);
    if (!page.ok) console.log('⚠️ Trang bài bị chặn/lỗi. Đầu phản hồi:', page.text.slice(0, 300));
  }

  console.log('\nGhi lại kết quả vào src/doc/shadowing-spike-notes.md (S0.5).');
}

main().catch((e) => {
  console.error('Lỗi:', e);
  process.exit(1);
});
