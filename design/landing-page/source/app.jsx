// Main app — Design canvas with 3 directions + tokens

const App = () => (
  <DesignCanvas defaultZoom={0.6}>
    {/* Landing page · Bún marketing site */}
    <DCSection id="landing" title="★ Landing page · Bún" subtitle="V1 · BLUE + animation max — showcase">
      <DCArtboard id="landing-v1" label="V1 · BLUE + animation max (showcase)" width={1280} height={3500}>
        <BunLanding_v1 />
      </DCArtboard>
    </DCSection>

    {/* V2 — pick & mix */}
    <DCSection id="v2" title="★ V2 · Pick & Mix" subtitle="Palette Playground + dashboard Storybook + reveal Reader's Desk · soft borders, white bg, multi-color">
      <DCArtboard id="v2-dashboard" label="Dashboard" width={1280} height={960}>
        <V_Dashboard />
      </DCArtboard>
      <DCArtboard id="v2-review-typing" label="Review · Typing (no mascot, cute)" width={1280} height={820}>
        <V_ReviewTyping />
      </DCArtboard>
      <DCArtboard id="v2-review-reveal" label="Review · Reveal + rate" width={1280} height={940}>
        <V_ReviewReveal />
      </DCArtboard>
    </DCSection>

    {/* V2 — More pages */}
    <DCSection id="v2-more" title="★ V2 · Các page khác" subtitle="Add word, Decks list, Deck detail, Dictionary, Settings — cùng hệ thống V2">
      <DCArtboard id="v2-add" label="Thêm từ + Preview" width={1280} height={960}>
        <V_AddWord />
      </DCArtboard>
      <DCArtboard id="v2-decks" label="Bộ từ (list)" width={1280} height={820}>
        <V_DecksList />
      </DCArtboard>
      <DCArtboard id="v2-deck-detail" label="Chi tiết 1 bộ" width={1280} height={960}>
        <V_DeckDetail />
      </DCArtboard>
      <DCArtboard id="v2-dictionary" label="Từ điển" width={1280} height={960}>
        <V_Dictionary />
      </DCArtboard>
      <DCArtboard id="v2-settings" label="Cài đặt" width={1280} height={860}>
        <V_Settings />
      </DCArtboard>
      <DCArtboard id="v2-flashcard" label="Flashcard nhanh · Đang chơi" width={1280} height={900}>
        <V_Flashcard />
      </DCArtboard>
      <DCArtboard id="v2-flashcard-result" label="Flashcard nhanh · Kết quả" width={1280} height={880}>
        <V_FlashcardResult />
      </DCArtboard>
    </DCSection>

    {/* Tokens overview — full row */}
    <DCSection id="tokens" title="Design tokens (3 variants gốc)" subtitle="3 hệ thống token song song để tham khảo">
      <DCArtboard id="tokens-all" label="Side-by-side · Reader's Desk · Playground · Storybook" width={1320} height={700}>
        <TokensOverview />
      </DCArtboard>
    </DCSection>

    {/* Direction A — Reader's Desk */}
    <DCSection id="dir-a" title="Gốc · A · Reader's Desk" subtitle="Readwise-leaning. Serif headlines, airy whitespace, single warm accent. Mascot là 'người bạn thầm lặng' trong margin.">
      <DCArtboard id="a-dashboard" label="Dashboard" width={1280} height={900}>
        <A_Dashboard />
      </DCArtboard>
      <DCArtboard id="a-review-typing" label="Review · Typing phase" width={1280} height={760}>
        <A_ReviewTyping />
      </DCArtboard>
      <DCArtboard id="a-review-reveal" label="Review · Reveal + rate" width={1280} height={900}>
        <A_ReviewReveal />
      </DCArtboard>
    </DCSection>

    {/* Direction B — Playground */}
    <DCSection id="dir-b" title="Gốc · B · Playground" subtitle="Duolingo-leaning. Chunky 3D buttons, multi-color, hearts/gems/XP. Ngọc là nhân vật chính — lớn, biểu cảm.">
      <DCArtboard id="b-dashboard" label="Dashboard" width={1280} height={900}>
        <B_Dashboard />
      </DCArtboard>
      <DCArtboard id="b-review-typing" label="Review · Typing phase" width={1280} height={760}>
        <B_ReviewTyping />
      </DCArtboard>
      <DCArtboard id="b-review-reveal" label="Review · Reveal + rate" width={1280} height={900}>
        <B_ReviewReveal />
      </DCArtboard>
    </DCSection>

    {/* Direction C — Storybook */}
    <DCSection id="dir-c" title="Gốc · C · Storybook" subtitle="Hybrid ấm áp. Serif + rounded sans + chữ viết tay, ribbon banner, polaroid, paper noise. Ngọc là narrator.">
      <DCArtboard id="c-dashboard" label="Dashboard" width={1280} height={900}>
        <C_Dashboard />
      </DCArtboard>
      <DCArtboard id="c-review-typing" label="Review · Typing phase" width={1280} height={760}>
        <C_ReviewTyping />
      </DCArtboard>
      <DCArtboard id="c-review-reveal" label="Review · Reveal + rate" width={1280} height={900}>
        <C_ReviewReveal />
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
