# Prompt: dashboard-progress-review (2026-07-31)

User message, verbatim (chat, Vietnamese — with screenshots of /decks
showing "Học đầy đủ / Chỉ hiểu nghĩa" tabs mockup, the dashboard "Bộ từ"
widget with every deck at 0%, and the 4 stat tiles "954 Từ mới / 126 Đang
học / 0 Đang ôn / 0 Thuộc rồi / 1080 từ"):

> % tính đã học đang sai, 1 số bộ học rồi mà vẫn để 0%, bộ từ tách ra 2
> tab cho loại chỉ hiểu và loại học kỹ, % cũng đang tính sai, phần này
> cũng sai, review lại toàn bộ dashboard

Decisions answered during planning:

1. Deck % → weighted by SRS stage (new=0, learning=1/3, review=2/3,
   mastered=1).
2. "Chỉ hiểu nghĩa" decks → own /decks tab AND excluded from the dashboard
   4 stat tiles + "từ mới chờ học".
3. Mastered gate → loosened to interval ≥ 21 days && reps ≥ 3 (Anki-style
   "mature"), with a retro-promote migration.
4. Timezone → keep server timezone; just fix the queries that mixed two
   timezones in one comparison.
