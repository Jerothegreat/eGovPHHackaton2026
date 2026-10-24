// Testing contextual responses in Resident Console Chat

const testPrompts = [
  "What emergency aid can I request?",
  "What should I prepare before evacuation?",
  "Who can I call now?",
  "Is there a typhoon coming?",
  "How to get my Digital National ID in eGovPH?"
]

function mockAssistant(prompt) {
  const lower = prompt.toLowerCase()
  if (lower.includes("hotline") || lower.includes("number") || lower.includes("call") || lower.includes("contact")) {
    return {
      data: `Here are the official National & Local Disaster Emergency Hotlines:\n\n1. **National Emergency Hotline**: 911\n2. **NDRRMC Operational Command Center**: (02) 8911-1406 / (02) 8912-2665\n3. **Philippine Red Cross Emergency Services**: 143 / (02) 8790-2300\n4. **PCG (Philippine Coast Guard)**: 0917-724-3682\n5. **Local MDRRMO / Barangay Command**: Access check-in queue or contact your local Barangay Health Worker.`,
      source: "local_fallback"
    }
  }
  if (lower.includes("typhoon") || lower.includes("storm") || lower.includes("signal") || lower.includes("flood")) {
    return {
      data: `For active storm warnings or typhoon alerts:\n\n1. Charge all mobile devices, power banks, and emergency flashlights.\n2. Keep your eGovPH Mobile ID and physical emergency bag accessible.\n3. Complete your **HANDA Household Check-in** in the app to notify your Barangay of your location and critical needs (food, water, medicine, shelter).\n4. Evacuate immediately if local authorities issue forced evacuation orders.`,
      source: "local_fallback"
    }
  }
  if (lower.includes("emergency aid") || lower.includes("relief") || lower.includes("assistance") || lower.includes("evacuation")) {
    return {
      data: `For HANDA emergency assistance, you can request support such as:\n\n1. **Food and clean water** for your household\n2. **Temporary shelter or evacuation support** if your home is unsafe\n3. **Medicine or first aid** for urgent medical needs\n4. **Rescue or transport assistance** if someone is trapped, injured, or unable to travel\n5. **Barangay follow-up** by completing your HANDA check-in so responders can prioritize your case\n\nIf the situation is life-threatening, call **911** immediately.`,
      source: "local_fallback"
    }
  }
  return {
    data: `Regarding your inquiry **"${prompt}"**:\n\n1. **Disaster Assistance**: Complete your active Disaster Needs Check-in inside HANDA so your Barangay Command Center can prioritize relief distribution.\n2. **Emergency Hotlines**: Call **911** for immediate medical/fire rescue or 143 for Red Cross.\n3. **Official Updates**: Monitor local PAGASA typhoon bulletins and your Barangay Command Center announcements.`,
    source: "local_fallback"
  }
}

console.log('--- Testing Resident Help Chat Queries ---')
for (const p of testPrompts) {
  console.log(`\nCitizen: "${p}"`)
  const ans = mockAssistant(p)
  console.log(`AI (${ans.source}):\n${ans.data}`)
}
