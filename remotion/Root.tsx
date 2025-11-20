import { Composition, registerRoot } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { CaptionComposition } from "./CaptionComposition";
import { ensureCaptionFonts } from "./fonts";
import {
  DEFAULT_FPS,
  DEFAULT_VIDEO_DIMENSIONS,
  SAMPLE_CAPTIONS,
} from "../src/lib/constants/captions";
import type { CaptionCompositionProps } from "../src/lib/types/captions";
import {
  calculateDurationFromCaptions,
  sanitizeSegments,
} from "../src/lib/utils/captions";

const defaultProps: CaptionCompositionProps = {
  captions: sanitizeSegments(SAMPLE_CAPTIONS),
  videoSrc: "samples/sample-input.mp4",
  stylePreset: "standard",
  placement: "bottom",
  fps: DEFAULT_FPS,
  duration: calculateDurationFromCaptions(SAMPLE_CAPTIONS),
  width: DEFAULT_VIDEO_DIMENSIONS.width,
  height: DEFAULT_VIDEO_DIMENSIONS.height,
};

export const RemotionRoot = () => {
  const durationInFrames =
    Math.ceil(
      calculateDurationFromCaptions(defaultProps.captions) * DEFAULT_FPS
    ) + DEFAULT_FPS;

  const calculateMetadata: CalculateMetadataFunction<
    CaptionCompositionProps
  > = async ({ props }) => {
    // Ensure fonts are loaded before rendering
    await ensureCaptionFonts();

    const safeCaptions = props.captions ?? defaultProps.captions;
    const fps = props.fps ?? DEFAULT_FPS;
    const effectiveDuration =
      Number.isFinite(props.duration) && (props.duration ?? 0) > 0
        ? (props.duration as number)
        : calculateDurationFromCaptions(safeCaptions);
    return {
      durationInFrames: Math.ceil(effectiveDuration * fps) + fps,
      props: {
        ...props,
        duration: effectiveDuration,
      },
    };
  };

  return (
    <Composition
      id="CaptionComposition"
      component={CaptionComposition}
      durationInFrames={durationInFrames}
      fps={DEFAULT_FPS}
      width={DEFAULT_VIDEO_DIMENSIONS.width}
      height={DEFAULT_VIDEO_DIMENSIONS.height}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
  );
};

export default RemotionRoot;

registerRoot(RemotionRoot);
