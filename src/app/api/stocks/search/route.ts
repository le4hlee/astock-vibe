import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/stock-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const marketParam = searchParams.get("market");
  const market =
    marketParam === "US" || marketParam === "KR" ? marketParam : undefined;

  if (query.trim().length < 1) {
    return NextResponse.json([]);
  }

  const results = await searchStocks(query, market);
  return NextResponse.json(results);
}
