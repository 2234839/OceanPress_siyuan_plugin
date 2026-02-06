import { Type, Static } from '@sinclair/typebox';

export type VideoProps = Static<typeof VideoProps>;
export const VideoProps = Type.Object({
  startTime: Type.Number({ minimum: 0, default: 0 }),
  endTime: Type.Number({ minimum: 0, default: 0 }),
});
