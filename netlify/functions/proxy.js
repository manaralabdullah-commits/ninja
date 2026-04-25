const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5YxNHGXX7S-1USNXogzhEeBRQwjQCtqcfFx0fr28npYnWIXjy9LIcCHOOopeWa7PL/exec";

exports.handler = async (event) => {
  const func = event.queryStringParameters?.func || "getProjectsData";
  const data = event.queryStringParameters?.data || null;

  let url = `${APPS_SCRIPT_URL}?func=${func}`;
  if (data) url += `&data=${encodeURIComponent(data)}`;

  try {
    const response = await fetch(url, { redirect: "follow" });
    const text = await response.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};