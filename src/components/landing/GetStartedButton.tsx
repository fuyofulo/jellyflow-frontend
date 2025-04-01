"use client";
import React from "react";
import Link from "next/link";
import { ButtonWithIcon } from "../buttons/ButtonWithIcon";
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
    </div>
  );
};

export default GetStartedButton;
