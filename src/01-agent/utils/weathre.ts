import axios from "axios";

type WeatherResponse = {
  current_condition: Array<{
    temp_C: string;
    weatherDesc: Array<{ value: string }>;
  }>;
};

export async function getWeather(city: string): Promise<string> {
  const url = `https://wttr.in/${city}?format=j1`;

  try {
    // 发起请求
    const response = await axios.get<WeatherResponse>(url);

    const data = response.data;

    // 提取数据
    const currentCondition = data.current_condition?.[0];

    if (!currentCondition) {
      throw new Error("天气数据为空");
    }

    const weatherDesc = currentCondition.weatherDesc?.[0]?.value;
    const tempC = currentCondition.temp_C;

    if (!weatherDesc || !tempC) {
      throw new Error("天气字段缺失");
    }

    return `${city}当前天气:${weatherDesc}，气温${tempC}摄氏度`;
  } catch (error: any) {
    // axios 错误处理
    if (error.response) {
      return `错误: 请求失败 - 状态码 ${error.response.status}`;
    } else if (error.request) {
      return `错误: 查询天气时遇到网络问题`;
    } else {
      return `错误: ${error.message}`;
    }
  }
}
