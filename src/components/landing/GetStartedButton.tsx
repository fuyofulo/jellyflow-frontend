"use client";
import React from "react";
import Link from "next/link";
import { ButtonWithIcon } from "../ui/buttons/ButtonWithIcon";
import GoogleSVG from "../logos/GoogleSVG";
import MailSVG from "../logos/MailSVG";

const GetStartedButton = () => {
  return (
    <div className="flex flex-col">
      <div>
        <Link href="/signup">
          <ButtonWithIcon icon={<MailSVG />}>
            Get Started with Email
          </ButtonWithIcon>
        </Link>
      </div>

      <div className="mt-4">
        <ButtonWithIcon icon={<GoogleSVG />}>
          Get Started with Google
        </ButtonWithIcon>
      </div>
    </div>
  );
};

export default GetStartedButton;
