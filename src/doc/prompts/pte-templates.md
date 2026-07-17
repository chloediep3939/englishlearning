# Prompt: pte-templates

> Date: 2026-07-17
> Saved verbatim from chat (user request + clarifications). Original language: Vietnamese.

## Original request

tôi đang luyên PTE tôi muốn đưa templeta bộ vào để học thuộc, thì nên đưa như thế nào. The three speakers are talking about / [topic] //
The first speaker starts by mentioning / that he [N1]. //
He has an issue with [N2], / and he's also thinking about [N3]. //
He also has a concern about [N4], / saying that this gives him [N5]. //
The second speaker disagrees with the first speaker, / because he is concerned that [N6]. //
He also mentions [N7], / saying that he can [N8]. //
He also points out that [N9], / and that [N10]. //
The third speaker agrees and supports these ideas, / especially when talking about [N11]. //
He says [N12] is very important, / reporting that [N13]. //
In the end, he talks about [N14], / concluding that [N15]. // The three speakers are talking about phone use in class. // The first speaker starts by mentioning banning phone use. // He has an issue with students distracted by texts, / and he's also thinking about switching off phones. // He also has a concern about kids using phones at meals, / saying that this gives him less family time. // The second speaker disagrees with the first speaker, / because he is concerned that phones help weak students. // He also mentions looking up information, / saying that he can make lessons lively. // He also points out that teachers use phones too, / and that rules should apply equally. // The third speaker agrees / and supports these ideas, especially when talking about a phone storage area. // He says a clear policy is very important, / reporting that phones should stay off. // In the end, he talks about running a pilot program, / concluding that they'll draft a proposal. // đây là từ đã thay, hãy suggest cho tôi

## Mid-planning clarifications from the user

- mục tiêu là học thuộc templete và dc nghe đọc nhiều nha, do mình thấy nghe nhiều dễ thuộc, mình đưa nó vào bộ từ dạng từ vựng rồi học luôn nhưng thấy nó hơi sai

## Agreed scope (via question rounds)

- Dedicated feature: template LIBRARY (multiple templates, CRUD) at /templates.
- 4 practice modes: (1) karaoke + echo (Edge TTS Aria; can read the unfilled frame with slots stripped, or a filled example; loop-whole-speech toggle), (2) progressive hiding memorization (25→100%, per-line listen + play-all while hidden), (3) fill slots for a new topic (form or paste-whole) → assembled speech → karaoke, (4) slot recall quiz (type back slot contents of a saved fill, lenient grading).
- Slots are NOT hard-coded to 16 — any `[name]` tokens (1–40) parsed from the frame; adding [N16], [N17]… later just works.
- NOT in scope: SRS scheduling for templates.
