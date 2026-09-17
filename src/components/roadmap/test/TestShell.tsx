'use client';

import CloseConfirm from './CloseConfirm';
import TestModal from './TestModal';

interface Props {
  variant: 'modal' | 'page';
  requestClose: () => void;
  confirmOpen: boolean;
  answered: number;
  total: number;
  finished: boolean;
  passed: boolean | null;
  saving: boolean;
  partialNote?: string;
  save: () => Promise<boolean>;
  onClose: () => void;
  onCancelConfirm: () => void;
  children: React.ReactNode;
}

/** Vỏ chung: khung nội dung + hộp hỏi lưu, bọc trong popup nếu variant = modal. */
export default function TestShell({
  variant,
  requestClose,
  confirmOpen,
  answered,
  total,
  finished,
  passed,
  saving,
  partialNote,
  save,
  onClose,
  onCancelConfirm,
  children,
}: Props) {
  const body = (
    <div
      style={{
        width: '100%',
        maxWidth: 620,
        margin: '0 auto',
        padding: variant === 'modal' ? '20px 20px 24px' : '12px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {children}
      {confirmOpen && (
        <CloseConfirm
          answered={answered}
          total={total}
          finished={finished}
          passed={passed}
          saving={saving}
          partialNote={partialNote}
          onSave={async () => {
            if (await save()) onClose();
          }}
          onDiscard={onClose}
          onCancel={onCancelConfirm}
        />
      )}
    </div>
  );

  return variant === 'modal' ? (
    <TestModal onRequestClose={requestClose} escDisabled={confirmOpen}>
      {body}
    </TestModal>
  ) : (
    body
  );
}
