export const mockIncidents = [
  {
    id: "inc_001",
    original_text: "Urgent! Big migrant clashes happening near Electronic City phase 1, pin 560100. Water mafia involved. Avoid the area!!",
    translated_text: "Urgent! Big migrant clashes happening near Electronic City phase 1, pin 560100. Water mafia involved. Avoid the area!!",
    location: {
      pin_code: "560100",
      area_name: "Electronic City phase 1",
      lat: 12.8399,
      lng: 77.6770
    },
    threat_score: 9,
    panic_index: 9,
    velocity_score: 8,
    static_score: 3,
    triggers: ["urgent", "water mafia", "migrant clashes", "electronic city"],
    is_actionable: true,
    draft_response: "NammaShanti has received reports concerning alleged migrant clashes and water mafia involvement near Electronic City Phase 1. Police are actively verifying. Avoid sharing unconfirmed information.",
    timestamp: "2026-04-25T11:45:00Z"
  },
  {
    id: "inc_002",
    original_text: "Mob gathering outside majestic bus stand. They have weapons and are breaking buses. Send help immediately!",
    translated_text: "Mob gathering outside majestic bus stand. They have weapons and are breaking buses. Send help immediately!",
    location: {
      pin_code: "560009",
      area_name: "Majestic",
      lat: 12.9774,
      lng: 77.5727
    },
    threat_score: 10,
    panic_index: 10,
    velocity_score: 10,
    static_score: 4,
    triggers: ["mob", "weapons", "breaking buses", "majestic"],
    is_actionable: true,
    draft_response: "Bengaluru Police is deploying units to Majestic area following reports of mob violence. Stay indoors and avoid the Kempegowda Bus Station vicinity.",
    timestamp: "2026-04-25T11:50:00Z"
  },
  {
    id: "inc_003",
    original_text: "There is a water cut in Koramangala block 3 since morning.",
    translated_text: "There is a water cut in Koramangala block 3 since morning.",
    location: {
      pin_code: "560034",
      area_name: "Koramangala Block 3",
      lat: 12.9279,
      lng: 77.6271
    },
    threat_score: 2,
    panic_index: 2,
    velocity_score: 1,
    static_score: 1,
    triggers: ["water cut", "koramangala"],
    is_actionable: false,
    draft_response: "BBMP confirms scheduled maintenance causing water disruption in Koramangala. Supply will resume by evening. There is no cause for panic.",
    timestamp: "2026-04-25T12:15:00Z"
  }
];
