import * as Contacts from "expo-contacts";
import { Alert } from "react-native";

/**
 * Device Contacts Helper
 * 
 * WHAT IT DOES:
 * Requests read access to device contacts using `expo-contacts`,
 * handles permission denial gracefully, and formats contact entries.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * Centralizing contact permissions prevents duplicate permission dialogs
 * and gives students the option to link a trusted campus contact when reporting items.
 */
export async function getDeviceContacts() {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert(
        "Contacts Permission Needed",
        "CampusConnect needs access to your contacts to let you quickly choose a phone number. You can also type numbers manually."
      );
      return [];
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      sort: Contacts.SortTypes.FirstName,
    });

    if (data && data.length > 0) {
      return data
        .filter((c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phoneNumbers[0]?.number || "",
        }));
    }

    return [];
  } catch (error) {
    console.error("Contacts Error:", error.message);
    return [];
  }
}
