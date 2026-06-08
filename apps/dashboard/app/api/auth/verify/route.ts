import { SiweMessage } from "siwe";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  try {
    const { message, signature } = await req.json();
    const siwe = new SiweMessage(message);
    const result = await siwe.verify({ signature, nonce: session.nonce });

    if (!result.success) {
      return Response.json({ ok: false, error: "Signature verification failed" }, { status: 401 });
    }

    session.address = result.data.address;
    session.chainId = result.data.chainId;
    session.nonce = undefined;
    await session.save();

    return Response.json({ ok: true, address: session.address });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 401 });
  }
}
