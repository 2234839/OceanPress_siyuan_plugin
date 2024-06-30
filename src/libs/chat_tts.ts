type data = {
  prompt: string;
  voice: number;
  speed: number;
  temperature: number;
  top_p: number;
  top_k: number;
  refine_max_new_token: number;
  infer_max_new_token: number;
  text_seed: number;
  skip_refine: number;
  custom_voice: number;
};
type par = Partial<data> & { text: string };
type chatTTS_res = {
  audio_files: {
    audio_duration: number;
    filename: string;
    inference_time: number;
    url: string;
  }[];
  code: number;
  filename: string;
  msg: string;
  url: string;
};
/** 默认 apiURL = http://127.0.0.1:9966/tts */
export function chatTTS(data: par): Promise<chatTTS_res>;
export function chatTTS(apiURL: string, data: par): Promise<chatTTS_res>;
export function chatTTS(...arg: [par] | [string, par]): Promise<chatTTS_res> {
  const [apiURL, data] = arg.length == 2 ? [arg[0], arg[1]] : ["http://127.0.0.1:9966/tts", arg[0]];

  const par = Object.assign(
    {
      text: "",
      prompt: "",
      voice: "11.csv",
      speed: 5,
      temperature: 0.3,
      top_p: 0.7,
      top_k: 20,
      refine_max_new_token: 384,
      infer_max_new_token: 2048,
      text_seed: 42,
      skip_refine: 0,
      custom_voice: 0,
    },
    data,
  );
  const from = new FormData();
  Object.entries(par).forEach(([key, value]) => {
    from.append(key, String(value));
  });
  return fetch(apiURL, {
    body: from,
    method: "POST",
  }).then((r) => r.json());
}
