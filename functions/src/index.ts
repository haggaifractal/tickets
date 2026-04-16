import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import axios from "axios";

setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// Priority ERP API Secrets
const priorityAppId = defineSecret("PRIORITY_APP_ID");
const priorityAppKey = defineSecret("PRIORITY_APP_KEY");
const priorityCompany = defineSecret("PRIORITY_COMPANY_URL");

/**
 * Trigger: Fires when a new time_entry log is created in Firestore.
 * Purpose: Send the billable hours or job completion to Priority ERP automatically.
 */
export const syncTimeEntryToPriority = onDocumentCreated(
  {
    document: "time_entries/{entryId}",
    secrets: [priorityAppId, priorityAppKey, priorityCompany],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.info("No data associated with the event.");
      return;
    }

    const timeEntry = snapshot.data();
    logger.info(`Processing new time entry for Priority: ${event.params.entryId}`, timeEntry);

    try {
      // Structure the payload for the Priority API endpoint.
      // E.g., POST to: ${priorityCompany.value()}/odata/Priority/tabula.ini/a1/...
      
      const payload = {
        // Priority OData format payload goes here once mapping is supplied
        TicketId: timeEntry.ticketId,
        CustomTechId: timeEntry.techId,
        DurationMinutes: timeEntry.durationMinutes,
      };

      logger.info("Sending payload to Priority...", payload);
      
      // TODO: Uncomment when ready with exact API URL and actual mapping
      /*
      const response = await axios.post(
        `${priorityCompany.value()}/YOUR_API_ENDPOINT`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-App-Id": priorityAppId.value(),
            "X-App-Key": priorityAppKey.value()
          }
        }
      );
      
      // Optionally update Firestore to mark as synced
      await snapshot.ref.update({ priority_synced: true, priority_ref: response.data.RecordId });
      */

    } catch (error) {
      logger.error("Failed to sync structural time entry to Priority", error);
      // In a robust system, you might want to write error status back to the logic context.
      await snapshot.ref.update({ priority_synced: false, priority_error: String(error) });
    }
  }
);

/**
 * Webhook Endpoint: Listens for HTTP POST commands from Priority.
 * Purpose: Push newly created Clients/Companies into Firestore natively.
 */
export const priorityWebhook = onRequest(
  { secrets: [priorityAppKey] },
  async (req, res) => {
    // 1. Verify Authorization Header to ensure the request is from YOUR Priority instance.
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${priorityAppKey.value()}`) {
      logger.warn("Unauthorized webhook attempt.");
      res.status(401).send("Unauthorized");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const priorityData = req.body;
    logger.info("Received payload from Priority Webhook:", priorityData);

    try {
      // TODO: Map the priority payload to our Firestore Client document format
      // const admin = require("firebase-admin");
      // admin.initializeApp();
      // await admin.firestore().collection("clients").add({
      //   name: priorityData.CUSTNAME,
      //   priorityCustomerId: priorityData.CUST,
      //   phone: priorityData.PHONE,
      //   ...
      // });

      res.status(200).send({ success: true, message: "Client processed successfully." });
    } catch (error) {
      logger.error("Failed to process Priority Webhook", error);
      res.status(500).send({ success: false, error: "Internal Server Error" });
    }
  }
);
