import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`turex-general api listening on http://localhost:${env.PORT}`);
});
