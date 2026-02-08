import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, displayName } = await req.json();

    if (!email || !displayName) {
      return new Response(
        JSON.stringify({ error: "Email and displayName are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user by email using admin API
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      throw new Error(`Failed to list users: ${getUserError.message}`);
    }

    const user = users.find((u) => u.email === email);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update or create profile
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: displayName,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      throw new Error(`Failed to update profile: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Profile updated for ${email}`,
        userId: user.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
