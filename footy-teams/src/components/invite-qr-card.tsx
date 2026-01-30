"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  code: string;
};

export function InviteQrCard({ code }: Props) {
  const [link, setLink] = useState(`/invite/${code}`);

  useEffect(() => {
    setLink(`${window.location.origin}/invite/${code}`);
  }, [code]);

  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let isActive = true;
    QRCode.toString(link, {
      type: "svg",
      margin: 1,
      width: 180,
      color: {
        dark: "#111827",
        light: "#FFFFFF",
      },
    })
      .then((markup: string) => {
        if (isActive) setSvg(markup);
      })
      .catch(() => {
        if (isActive) setSvg("");
      });

    return () => {
      isActive = false;
    };
  }, [link]);

  return (
    <div className="flex items-center justify-center rounded-lg border border-border bg-card p-4">
      <div
        className="h-[180px] w-[180px]"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
