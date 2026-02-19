import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure Web Push with VAPID keys from Environment Variables
const vapidSubject = "mailto:admin@troco.app";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

serve(async (req) => {
    try {
        const { record } = await req.json();
        // This example assumes it's triggered by a Database Webhook or Scheduled Function
        // 'record' would be the payload. For a cron, we might query DB here.

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Example Logic: Notify a specific user about a bill
        // In a real scenario, you'd iterate over users with bills due today

        // For testing/demo, let's assume we receive a direct target user_id in the body
        // or we query for everyone. Let's just query for a specific user to prevent spam.
        const targetUserId = record?.user_id;

        if (!targetUserId) {
            return new Response(JSON.stringify({ message: "No target user" }), { status: 200 });
        }

        // Get subscriptions for this user
        const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", targetUserId);

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: "No subscriptions found" }), { status: 200 });
        }

        const payload = JSON.stringify({
            title: "Conta a Pagar! 💸",
            body: `Olá! Lembre-se de pagar sua conta: ${record?.descricao || 'Investimento'} no valor de R$ ${record?.valor}.`,
            url: "/"
        });

        // Send notifications
        const promises = subscriptions.map((sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: atob(sub.p256dh), // Decode from DB storage
                    auth: atob(sub.auth)
                }
            };

            return webpush.sendNotification(pushSubscription, payload)
                .catch((err) => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription is gone, delete from DB
                        return supabase.from("push_subscriptions").delete().eq("id", sub.id);
                    }
                    console.error("Error sending push:", err);
                });
        });

        await Promise.all(promises);

        return new Response(JSON.stringify({ message: "Notifications sent!" }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
