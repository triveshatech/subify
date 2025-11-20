import { Config } from "remotion";

type RemotionConfigAPI = {
  setVideoImageFormat: (format: "jpeg" | "png" | "none") => void;
  setCodec: (codec: string) => void;
  setOverwriteOutput: (overwrite: boolean) => void;
  setTimeoutInMilliseconds: (ms: number) => void;
};

const RemotionConfig = Config as RemotionConfigAPI;

RemotionConfig.setVideoImageFormat("jpeg");
RemotionConfig.setCodec("h264");
RemotionConfig.setOverwriteOutput(true);
RemotionConfig.setTimeoutInMilliseconds(60000);
