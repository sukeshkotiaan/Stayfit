

async function test() {
  const res = await fetch("https://stayfit-rho.vercel.app/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Hello, this is a test. Reply 'yes'." })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
