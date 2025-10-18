import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Last Updated: March 21, 2025</p>
            <p className="text-muted-foreground">Effective Date: March 21, 2025</p>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <p className="text-lg">
              Welcome to our Privacy Policy!
            </p>

            <p>
              Your privacy and security are paramount to us at Blaze. We strive to be transparent and honest about how we handle your data. This Privacy Policy outlines our practices regarding the collection, use, and protection of your personal information.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Consent for Minors</h2>
              <p>
                If you are under 13 years old, you must obtain permission from your parents/guardians before using Blaze. Your local laws, however, may prohibit users who are under 16 to use social media, such as Australia and the EU. Check your local laws for more information. We adhere to regulations such as COPPA (Children's Online Privacy Protection Act) to ensure compliance and protect minors' privacy. If it is found that you are under 13 or under the age of restriction in your country, and you decide to use Blaze, you will be banned from the platform until you become the legal age to use social media in your country.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Data Collection</h2>
              <p>We collect the following information:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Username (and/or full name)</li>
                <li>Email Address</li>
                <li>Location (for data reports, billing (except PayPal, since they do not give this info to us), and IP blocking purposes only)</li>
                <li>Credit Card Numbers (when purchasing items)</li>
                <li>BTC Addresses (when purchasing items via Bitcoin)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Use Of Information</h2>
              <p>We prioritize your privacy and only use your data for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Contacting you</li>
                <li>Data reports for public display (non-identifiable data) to improve our services and report our website's progress</li>
                <li>Blocking IPs if necessary for security purposes</li>
                <li>Processing and verifying orders and transactions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Protection</h2>
              <p>
                We are committed to protecting your data and do not engage in the sale or tracking of your personal information. However, please note that our website host, WIX, may have its own data practices outlined in their Privacy Policy. We only store credit card information when purchasing things, and we cannot see any of the items purchased with your credit card, as this is processed by PayPal & Stripe, who also has their own data practices outlined in their Privacy Policy as well, including Stripe in their Privacy Policy. BTC addresses are collected and processed by us in order to confirm and verify that your transaction is accurate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. User Controls</h2>
              <p>
                Your control over your data is important to us. We aim to provide transparency and control to our users. Please feel free to contact us at <a href="mailto:contactblaze@proton.me" className="text-primary hover:underline">contactblaze@proton.me</a> or text us at <a href="tel:+15623525293" className="text-primary hover:underline">+1 (562)-35BLAZE (+1 (562)-352-5293)</a> for privacy inquiries and complaints. We ensure timely responses within 60 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Complaints and Enforcement</h2>
              <p>
                If you believe that we have violated your rights or relevant privacy laws, you have the right to file a complaint. Please contact us at <a href="mailto:contactblaze@proton.me" className="text-primary hover:underline">contactblaze@proton.me</a>. For Californian residents, you may also file a complaint with the California Attorney General's office. For EU residents, you can file a complaint with relevant Data Protection Authorities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Changes to Policies</h2>
              <p>
                We are committed to maintaining the highest standards of privacy protection. Any changes to our policies will be communicated to you promptly.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
