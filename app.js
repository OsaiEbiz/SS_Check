import { filterCreatedContact } from "./controlls/controlls.js";
import express from "express"

const app = express()
const PORT = 5000
app.use(express.json())

try {
    app.listen(PORT, async () => {
        console.log(`Node connected on the Port: ${PORT}`);

        await filterCreatedContact();
    });
} catch (err) {
    console.log(`Server connection error - ${err}`);
}
