import nodemailer from "nodemailer";
import { SentMessageInfo } from "nodemailer/lib/smtp-transport";
import { Options } from "nodemailer/lib/mailer";

class MailService {
	transporter?: nodemailer.Transporter<SentMessageInfo>;
	constructor() {
		this.transporter ??= nodemailer.createTransport({
			host: process.env.EMAIL_HOST || "smtp.gmail.com",
			port: parseInt(process.env.EMAIL_PORT || "587"),
			secure: false, // true for 465, false for other ports
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});
	}

	// async replaceMailTemplate(sHtml: string, oReplace: string | any[]) {
	//   let sReturn = sHtml;
	//   for (let i = 0; i < oReplace.length; i++) {
	//     sReturn = sReturn.replace(oReplace[i].replace, oReplace[i].textReplace);
	//   }
	//   return sReturn;
	// }

	async sendmail(mailOptions: Options) {
		return this.transporter!.sendMail(mailOptions);
	}
}

export default MailService;
