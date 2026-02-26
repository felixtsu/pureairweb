import { NextRequest, NextResponse } from "next/server";

import { isAgentApiAuthorized } from "@/lib/agent-api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const allowedRequestTypes = ["repair", "cleaning"] as const;
type ServiceRequestType = (typeof allowedRequestTypes)[number];

interface PlaceServiceRequestBody {
  userId?: string;
  requestType?: string;
  productName?: string;
  model?: string;
  issueDescription?: string;
}

function isAllowedRequestType(value: string): value is ServiceRequestType {
  return (allowedRequestTypes as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  try {
    if (!isAgentApiAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: PlaceServiceRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const userId = body.userId?.trim() ?? "";
    const requestType = body.requestType?.trim() ?? "";
    const productName = body.productName?.trim() ?? "";
    const model = body.model?.trim() ?? "";
    const issueDescription = body.issueDescription?.trim() ?? "";

    if (!userId || !requestType || !productName || !model || !issueDescription) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: userId, requestType, productName, model, issueDescription",
        },
        { status: 400 }
      );
    }

    if (!isAllowedRequestType(requestType)) {
      return NextResponse.json(
        { error: "requestType must be one of: repair, cleaning" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        user_id: userId,
        request_type: requestType,
        product_name: productName,
        model,
        issue_description: issueDescription,
      })
      .select("id,status,created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create service request", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        requestId: data.id,
        status: data.status,
        createdAt: data.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Unexpected error while placing service request", detail },
      { status: 500 }
    );
  }
}
