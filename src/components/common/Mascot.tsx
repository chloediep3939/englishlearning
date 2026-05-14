import Image from 'next/image';

export type MascotPose =
  | 'idle'
  | 'happy'
  | 'blink'
  | 'sleep'
  | 'wake'
  | 'run-a'
  | 'run-b';

interface Props {
  pose?: MascotPose;
  size?: number;
  float?: boolean;
  bob?: boolean;
}

export default function Mascot({ pose = 'idle', size = 80, float = false, bob = false }: Props) {
  const animation = float
    ? 'v-ngoc-float 3.5s ease-in-out infinite'
    : bob
      ? 'v-ngoc-bob 2.2s ease-in-out infinite'
      : undefined;

  return (
    <Image
      src={`/mascot/ngoc-${pose}.png`}
      alt="Bún"
      width={size}
      height={size}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 4px 8px rgba(40,30,15,0.15))',
        animation,
      }}
      priority={pose === 'idle' || pose === 'happy'}
    />
  );
}
