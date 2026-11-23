import { test, expect } from "@playwright/test";

test("Patched Bookings Summary", async ({ page }) => {
    // Step 1 - Login and confirm My Bookings navigation
    await page.goto("/login");
    await page.getByLabel("Email").fill("sktester@gmail.com");
    await page.getByLabel("Password").fill("Secret@123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByTestId("nav-bookings")).toBeVisible();
    let livebookingRef;
    let patchedBooking;
    const apiURL = "https://api.eventhub.rahulshettyacademy.com/api";

    // Step 2 - Intercept bookings list response
    await page.route(`${apiURL}/bookings?page=1&limit=10`, async (route) => {
        const response = await route.fetch();
        const responseBody = await response.json();
        const bookings = responseBody.data;
        const booking = bookings[0];

        // Step 3 & 4 - Replace the 4 values with mock data and leave everything unchanged
        booking.bookingRef = "X-0MOCK0";
        booking.event.title = "This is an 0MOCK0 Event";
        booking.quantity = 5;
        booking.totalPrice = "1800";

        const livebooking = bookings[1];
        livebookingRef = livebooking.bookingRef;

        // Step 5 - Storing the patched booking for later checks
        patchedBooking = booking;

        await route.fulfill({ json: responseBody });
    });

    await page.getByTestId("nav-bookings").click();


    await expect(page.getByRole("heading", { name: "My Bookings", exact: true })).toBeVisible();
    const bookingcards = page.getByTestId("booking-card");
    await expect(bookingcards.first()).toBeVisible();  // inserted this line as code was breaking due to timing issue

    // Step 6 - Locate the patched card by reference text
    const mockCard = bookingcards.filter({ hasText: patchedBooking.bookingRef });
    await expect(mockCard.getByText(patchedBooking.event.title, { exact: true })).toBeVisible();
    await expect(mockCard.getByText(`🎫 ${patchedBooking.quantity} tickets`, { exact: true })).toBeVisible();
    await expect(mockCard.getByText("$" + Number(patchedBooking.totalPrice).toLocaleString("en-US"), { exact: true })).toBeVisible();

    // Step 7 - Confirm at one other card and shows different live booking reference
    const liveCard = bookingcards.filter({ hasText: livebookingRef });
    await expect(liveCard).toBeVisible();


    let untouchedEmail;
    // Step 9 - Intercept the detail response
    await page.route(`${apiURL}/bookings/${patchedBooking.id}`, async (route) => {
        const response = await route.fetch();
        const responseBody = await response.json();
        const bookingDetails = responseBody.data;
        untouchedEmail = bookingDetails.customerEmail;

        bookingDetails.bookingRef = patchedBooking.bookingRef;
        bookingDetails.event.title = patchedBooking.event.title;
        bookingDetails.quantity = patchedBooking.quantity;
        bookingDetails.totalPrice = patchedBooking.totalPrice;

        await route.fulfill({ json: responseBody });
    });

    // Step 8 - Open View details
    await mockCard.getByRole("button", { name: "View Details" }).click()
    await expect(page).toHaveURL(`/bookings/${patchedBooking.id}`);

    // Step 10 - Detail page assertions
    const bookingRef = page.getByRole("navigation").filter({ has: page.getByRole("link", { name: "My Bookings", exact: true }) });
    await expect(bookingRef.getByText(patchedBooking.bookingRef, { exact: true })).toBeVisible();
    const bookingTitle = page.getByRole("heading", { name: patchedBooking.event.title })
    await expect(bookingTitle).toBeVisible();
    const bookingQty = page.getByText("Tickets", { exact: true }).locator("..").getByText(String(patchedBooking.quantity), { exact: true })
    await expect(bookingQty).toBeVisible();
    const bookingTotal = page.getByText("Total Paid", { exact: true }).locator("..").getByText("$" + Number(patchedBooking.totalPrice).toLocaleString("en-US"), { exact: true });
    await expect(bookingTotal).toBeVisible();
    const bookingEmail = page.getByText("Email", { exact: true }).locator("..").getByText(untouchedEmail, { exact: true });
    await expect(bookingEmail).toBeVisible();

    // Step 11 - Return to My Bookings
    await page.getByRole("button", { name: "← Back to My Bookings" }).click();
    const bookTotal = mockCard.getByText("total", { exact: true }).locator("..").getByText("$" + Number(patchedBooking.totalPrice).toLocaleString("en-US"), { exact: true });
    await expect(bookTotal).toBeVisible();

});

