import { createParcel } from "../src/lib/couriers/dzship";

async function main() {
  const good = await createParcel(
    { courier: "sandbox" },
    { fullName: "Test Buyer", phone: "0550123456", wilayaCode: 31, communeName: "Oran",
      deliveryType: "home", productList: "Air-X Sneakers x1", codAmount: 4500, reference: "TEST-1" },
  );
  console.log("valid order  :", JSON.stringify(good));

  const bad = await createParcel(
    { courier: "sandbox" },
    { fullName: "Test Buyer", phone: "12345", wilayaCode: 31, communeName: "Oran",
      deliveryType: "home", productList: "x", codAmount: 4500, reference: "TEST-2" },
  );
  console.log("bad phone    :", JSON.stringify(bad));
}
main();