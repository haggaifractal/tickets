import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// Priority ERP API Secrets
const priorityAppId = defineSecret("PRIORITY_APP_ID");
const priorityAppKey = defineSecret("PRIORITY_APP_KEY");
const priorityCompany = defineSecret("PRIORITY_COMPANY_URL");

/**
 * Trigger: Fires when an existing time_entry log is updated in Firestore.
 * Purpose: Send the billable hours to Priority ERP automatically when billing_locked is set to true.
 */
export const syncTimeEntryToPriority = onDocumentUpdated(
  {
    document: "time_entries/{entryId}",
    secrets: [priorityAppId, priorityAppKey, priorityCompany],
  },
  async (event) => {
    const entryId = event.params.entryId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.info(`Missing data for entry ${entryId}`);
      return;
    }

    // Step 1: Idempotency Check & Trigger Verification
    // Only proceed if billing_locked transitioned from false/undefined to true
    // AND it has not already been synced.
    const justLocked = !beforeData.billing_locked && afterData.billing_locked;
    if (!justLocked) {
      logger.debug(`Entry ${entryId} was not just locked. Skipping.`);
      return;
    }

    if (afterData.priority_synced) {
      logger.info(`Entry ${entryId} is already synced to Priority. Skipping.`);
      return;
    }

    logger.info(`Processing newly locked time entry for Priority: ${entryId}`, afterData);

    try {
      // Step 2: Relational Lookups to gather ERP identifiers
      if (!afterData.ticketId) {
        throw new Error("Missing ticketId in TimeEntry.");
      }

      // Fetch Ticket
      const ticketRef = db.collection("tickets").doc(afterData.ticketId);
      const ticketSnap = await ticketRef.get();
      if (!ticketSnap.exists) {
        throw new Error(`Referenced ticket ${afterData.ticketId} does not exist.`);
      }
      const ticketData = ticketSnap.data()!;

      // Fetch Client
      if (!ticketData.clientId) {
        throw new Error(`Missing clientId in Ticket ${afterData.ticketId}.`);
      }
      const clientRef = db.collection("clients").doc(ticketData.clientId);
      const clientSnap = await clientRef.get();
      if (!clientSnap.exists) {
        throw new Error(`Referenced client ${ticketData.clientId} does not exist.`);
      }
      const clientData = clientSnap.data()!;

      // Verify that the necessary Priority Identifiers exist
      if (!clientData.priorityCustomerId) {
        throw new Error(`Client ${ticketData.clientId} is missing priorityCustomerId.`);
      }
      // If tickets have their own ID in Priority, check for it here:
      // if (!ticketData.priorityTicketId) throw new Error("...");

      // Fetch User (Tech)
      const userRef = db.collection("users").doc(afterData.techId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        throw new Error(`Referenced user ${afterData.techId} does not exist.`);
      }
      const userData = userSnap.data()!;
      if (!userData.priorityEmployeeId) {
        throw new Error(`User ${afterData.techId} is missing priorityEmployeeId.`);
      }

      // Step 3: API Request
      const payload = {
        PriorityCustomerId: clientData.priorityCustomerId,
        TicketReference: ticketData.priorityTicketId || afterData.ticketId,
        TechId: userData.priorityEmployeeId,
        DurationMinutes: afterData.durationMinutes,
        Description: afterData.description || "No description provided",
        Date: new Date(afterData.date).toISOString()
      };

      logger.info("Sending payload to Priority...", payload);
      
      // TODO: Replace YOUR_API_ENDPOINT with the actual endpoint from Priority ERP integration guide
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
      
      // Mark as successful
      await event.data!.after.ref.update({
        priority_synced: true,
        priority_error: null,
        priority_ref: response.data.RecordId || null,
        updatedAt: new Date().toISOString()
      });
      */
      
      // MOCK SUCCESS FOR NOW until real API is ready
      await event.data!.after.ref.update({
        priority_synced: true,
        priority_error: admin.firestore.FieldValue.delete(), // Remove any existing error
        updatedAt: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error(`Failed to sync time entry ${entryId} to Priority`, error);
      // Mark as failed in Firestore so it shows up in UI and can be retried
      await event.data!.after.ref.update({
        priority_synced: false,
        priority_error: error.message || String(error),
        updatedAt: new Date().toISOString()
      });
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
      /*
      await db.collection("clients").add({
        name: priorityData.CUSTNAME,
        priorityCustomerId: priorityData.CUST,
        phone: priorityData.PHONE,
        createdAt: new Date().toISOString()
      });
      */

      res.status(200).send({ success: true, message: "Client processed successfully." });
    } catch (error) {
      logger.error("Failed to process Priority Webhook", error);
      res.status(500).send({ success: false, error: "Internal Server Error" });
    }
  }
);

