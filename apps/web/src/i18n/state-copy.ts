import type { Locale } from "@/lib/types";

interface StateCopy {
  loading: string;
  errorKicker: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  notFoundKicker: string;
  notFoundTitle: string;
  notFoundBody: string;
  backHome: string;
}

export const STATE_COPY: Record<Locale, StateCopy> = {
  en: {
    loading: "Preparing market information…",
    errorKicker: "Unexpected application error",
    errorTitle: "This prepared view could not be shown.",
    errorBody:
      "No input was saved or sent. Retry this page; if the problem continues, use the source and methodology pages.",
    retry: "Try again",
    notFoundKicker: "Market route not found",
    notFoundTitle: "There is no report at this address.",
    notFoundBody:
      "Return to the market explorer to choose from the series in the current prepared dataset.",
    backHome: "Back to MandiLens",
  },
  hi: {
    loading: "बाज़ार की जानकारी तैयार की जा रही है…",
    errorKicker: "अनपेक्षित एप्लिकेशन त्रुटि",
    errorTitle: "यह तैयार दृश्य नहीं दिखाया जा सका।",
    errorBody:
      "कोई इनपुट सहेजा या भेजा नहीं गया। इस पृष्ठ को फिर से आज़माएँ; समस्या बनी रहे तो स्रोत और कार्यविधि पृष्ठ देखें।",
    retry: "पुनः प्रयास करें",
    notFoundKicker: "बाज़ार मार्ग नहीं मिला",
    notFoundTitle: "इस पते पर कोई रिपोर्ट नहीं है।",
    notFoundBody: "वर्तमान तैयार डेटासेट की श्रृंखलाओं में से चुनने के लिए बाज़ार खोज पर लौटें।",
    backHome: "MandiLens पर वापस जाएँ",
  },
  kn: {
    loading: "ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ…",
    errorKicker: "ಅನಿರೀಕ್ಷಿತ ಅಪ್ಲಿಕೇಶನ್ ದೋಷ",
    errorTitle: "ಈ ಸಿದ್ಧಪಡಿಸಿದ ನೋಟವನ್ನು ತೋರಿಸಲಾಗಲಿಲ್ಲ.",
    errorBody:
      "ಯಾವುದೇ ನಮೂದನ್ನು ಉಳಿಸಲಾಗಿಲ್ಲ ಅಥವಾ ಕಳುಹಿಸಲಾಗಿಲ್ಲ. ಈ ಪುಟವನ್ನು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ; ಸಮಸ್ಯೆ ಮುಂದುವರಿದರೆ ಮೂಲ ಮತ್ತು ವಿಧಾನ ಪುಟಗಳನ್ನು ಬಳಸಿ.",
    retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    notFoundKicker: "ಮಾರುಕಟ್ಟೆ ಮಾರ್ಗ ಕಂಡುಬಂದಿಲ್ಲ",
    notFoundTitle: "ಈ ವಿಳಾಸದಲ್ಲಿ ವರದಿ ಇಲ್ಲ.",
    notFoundBody:
      "ಪ್ರಸ್ತುತ ಸಿದ್ಧಪಡಿಸಿದ ದತ್ತಾಂಶದಲ್ಲಿನ ಸರಣಿಯಿಂದ ಆಯ್ಕೆ ಮಾಡಲು ಮಾರುಕಟ್ಟೆ ಅನ್ವೇಷಕಕ್ಕೆ ಹಿಂತಿರುಗಿ.",
    backHome: "MandiLens ಗೆ ಹಿಂತಿರುಗಿ",
  },
  te: {
    loading: "మార్కెట్ సమాచారాన్ని సిద్ధం చేస్తోంది…",
    errorKicker: "ఊహించని అప్లికేషన్ లోపం",
    errorTitle: "ఈ సిద్ధం చేసిన వీక్షణను చూపలేకపోయాము.",
    errorBody:
      "ఏ ఇన్‌పుట్ సేవ్ చేయబడలేదు లేదా పంపబడలేదు. ఈ పేజీని మళ్లీ ప్రయత్నించండి; సమస్య కొనసాగితే మూలం మరియు పద్ధతి పేజీలను చూడండి.",
    retry: "మళ్లీ ప్రయత్నించండి",
    notFoundKicker: "మార్కెట్ మార్గం కనుగొనబడలేదు",
    notFoundTitle: "ఈ చిరునామాలో నివేదిక లేదు.",
    notFoundBody:
      "ప్రస్తుత సిద్ధం చేసిన డేటాసెట్‌లోని సిరీస్ నుండి ఎంచుకోవడానికి మార్కెట్ ఎక్స్‌ప్లోరర్‌కు తిరిగి వెళ్లండి.",
    backHome: "MandiLensకు తిరిగి వెళ్లండి",
  },
  ta: {
    loading: "சந்தைத் தகவல் தயாராகிறது…",
    errorKicker: "எதிர்பாராத பயன்பாட்டுப் பிழை",
    errorTitle: "இந்தத் தயாரிக்கப்பட்ட காட்சியைக் காட்ட முடியவில்லை.",
    errorBody:
      "எந்த உள்ளீடும் சேமிக்கப்படவோ அனுப்பப்படவோ இல்லை. இந்தப் பக்கத்தை மீண்டும் முயலவும்; சிக்கல் தொடர்ந்தால் ஆதாரம் மற்றும் முறைப் பக்கங்களைப் பார்க்கவும்.",
    retry: "மீண்டும் முயலவும்",
    notFoundKicker: "சந்தைப் பாதை கிடைக்கவில்லை",
    notFoundTitle: "இந்த முகவரியில் அறிக்கை இல்லை.",
    notFoundBody:
      "தற்போதைய தயாரிக்கப்பட்ட தரவுத்தொகுப்பில் உள்ள தொடர்களில் இருந்து தேர்வு செய்ய சந்தைத் தேடலுக்குத் திரும்பவும்.",
    backHome: "MandiLensக்குத் திரும்பவும்",
  },
  ml: {
    loading: "മാർക്കറ്റ് വിവരം തയ്യാറാക്കുന്നു…",
    errorKicker: "അപ്രതീക്ഷിത ആപ്ലിക്കേഷൻ പിശക്",
    errorTitle: "ഈ തയ്യാറാക്കിയ കാഴ്ച കാണിക്കാനായില്ല.",
    errorBody:
      "ഒരു വിവരവും സംരക്ഷിക്കുകയോ അയയ്ക്കുകയോ ചെയ്തിട്ടില്ല. ഈ പേജ് വീണ്ടും ശ്രമിക്കുക; പ്രശ്നം തുടരുകയാണെങ്കിൽ ഉറവിടവും രീതിയും ഉള്ള പേജുകൾ കാണുക.",
    retry: "വീണ്ടും ശ്രമിക്കുക",
    notFoundKicker: "മാർക്കറ്റ് വഴി കണ്ടെത്തിയില്ല",
    notFoundTitle: "ഈ വിലാസത്തിൽ റിപ്പോർട്ട് ഇല്ല.",
    notFoundBody:
      "നിലവിലെ തയ്യാറാക്കിയ ഡാറ്റാസെറ്റിലെ ശ്രേണികളിൽ നിന്ന് തിരഞ്ഞെടുക്കാൻ മാർക്കറ്റ് എക്സ്പ്ലോററിലേക്ക് മടങ്ങുക.",
    backHome: "MandiLensലേക്ക് മടങ്ങുക",
  },
  mr: {
    loading: "बाजार माहिती तयार केली जात आहे…",
    errorKicker: "अनपेक्षित अनुप्रयोग त्रुटी",
    errorTitle: "हे तयार दृश्य दाखवता आले नाही.",
    errorBody:
      "कोणतेही इनपुट जतन किंवा पाठवले गेले नाही. हे पृष्ठ पुन्हा वापरून पाहा; समस्या कायम राहिल्यास स्रोत आणि कार्यपद्धतीची पृष्ठे पहा.",
    retry: "पुन्हा प्रयत्न करा",
    notFoundKicker: "बाजार मार्ग सापडला नाही",
    notFoundTitle: "या पत्त्यावर अहवाल नाही.",
    notFoundBody: "सध्याच्या तयार डेटासेटमधील मालिका निवडण्यासाठी बाजार एक्सप्लोररवर परत जा.",
    backHome: "MandiLens वर परत जा",
  },
  or: {
    loading: "ବଜାର ସୂଚନା ପ୍ରସ୍ତୁତ ହେଉଛି…",
    errorKicker: "ଅପ୍ରତ୍ୟାଶିତ ଆପ୍ଲିକେସନ୍ ତ୍ରୁଟି",
    errorTitle: "ଏହି ପ୍ରସ୍ତୁତ ଦୃଶ୍ୟ ଦେଖାଯାଇ ପାରିଲା ନାହିଁ।",
    errorBody:
      "କୌଣସି ଇନପୁଟ୍ ସଞ୍ଚୟ କିମ୍ବା ପଠାଯାଇ ନାହିଁ। ଏହି ପୃଷ୍ଠାକୁ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ; ସମସ୍ୟା ରହିଲେ ଉତ୍ସ ଏବଂ ପଦ୍ଧତି ପୃଷ୍ଠା ଦେଖନ୍ତୁ।",
    retry: "ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ",
    notFoundKicker: "ବଜାର ପଥ ମିଳିଲା ନାହିଁ",
    notFoundTitle: "ଏହି ଠିକଣାରେ କୌଣସି ରିପୋର୍ଟ ନାହିଁ।",
    notFoundBody: "ବର୍ତ୍ତମାନର ପ୍ରସ୍ତୁତ ଡାଟାସେଟରୁ ବାଛିବା ପାଇଁ ବଜାର ଅନ୍ୱେଷକକୁ ଫେରନ୍ତୁ।",
    backHome: "MandiLensକୁ ଫେରନ୍ତୁ",
  },
  bn: {
    loading: "বাজারের তথ্য প্রস্তুত করা হচ্ছে…",
    errorKicker: "অপ্রত্যাশিত অ্যাপ্লিকেশন ত্রুটি",
    errorTitle: "এই প্রস্তুত দৃশ্যটি দেখানো যায়নি।",
    errorBody:
      "কোনো ইনপুট সংরক্ষণ বা পাঠানো হয়নি। এই পৃষ্ঠাটি আবার চেষ্টা করুন; সমস্যা থাকলে উৎস ও পদ্ধতির পৃষ্ঠাগুলি দেখুন।",
    retry: "আবার চেষ্টা করুন",
    notFoundKicker: "বাজারের পথ পাওয়া যায়নি",
    notFoundTitle: "এই ঠিকানায় কোনো প্রতিবেদন নেই।",
    notFoundBody: "বর্তমান প্রস্তুত ডেটাসেটের সিরিজ থেকে বেছে নিতে বাজার অনুসন্ধানে ফিরে যান।",
    backHome: "MandiLens-এ ফিরে যান",
  },
  gu: {
    loading: "બજારની માહિતી તૈયાર થઈ રહી છે…",
    errorKicker: "અનપેક્ષિત એપ્લિકેશન ભૂલ",
    errorTitle: "આ તૈયાર કરેલું દૃશ્ય બતાવી શકાયું નથી.",
    errorBody:
      "કોઈ ઇનપુટ સાચવવામાં કે મોકલવામાં આવ્યું નથી. આ પૃષ્ઠ ફરી અજમાવો; સમસ્યા ચાલુ રહે તો સ્રોત અને પદ્ધતિનાં પૃષ્ઠો જુઓ.",
    retry: "ફરી પ્રયાસ કરો",
    notFoundKicker: "બજારનો માર્ગ મળ્યો નથી",
    notFoundTitle: "આ સરનામે કોઈ અહેવાલ નથી.",
    notFoundBody: "હાલના તૈયાર ડેટાસેટની શ્રેણીમાંથી પસંદ કરવા બજાર એક્સપ્લોરર પર પાછા જાઓ.",
    backHome: "MandiLens પર પાછા જાઓ",
  },
};
