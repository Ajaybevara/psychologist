import os
import re
import json
import random
import bcrypt
import jwt
import datetime
from functools import wraps
from dateutil import parser
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'supersecret')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
PASSWORD_RESET_TOKEN_EXPIRY_HOURS = int(os.getenv('PASSWORD_RESET_TOKEN_EXPIRY_HOURS', '1'))

openai.api_key = OPENAI_API_KEY

DATA_DIR = 'data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def load_data(filename, default=None):
    if default is None:
        default = {}
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r') as f:
            data = json.load(f)
            # Convert date strings back to datetime objects
            if filename == 'users.json':
                for user in data.values():
                    if 'createdAt' in user and isinstance(user['createdAt'], str):
                        user['createdAt'] = parser.parse(user['createdAt'])
                    if 'lastLogin' in user and user['lastLogin'] and isinstance(user['lastLogin'], str):
                        user['lastLogin'] = parser.parse(user['lastLogin'])
                    if 'lastLogout' in user and user['lastLogout'] and isinstance(user['lastLogout'], str):
                        user['lastLogout'] = parser.parse(user['lastLogout'])
                    if 'resetExpires' in user and user.get('resetExpires') and isinstance(user['resetExpires'], str):
                        user['resetExpires'] = parser.parse(user['resetExpires'])
            elif filename in ['chats.json', 'moods.json', 'notes.json', 'admin_reports.json']:
                for item in data:
                    if 'createdAt' in item and isinstance(item['createdAt'], str):
                        item['createdAt'] = parser.parse(item['createdAt'])
            return data
    return default

def save_data(filename, data):
    path = os.path.join(DATA_DIR, filename)
    # Convert datetime objects to strings for JSON serialization
    data_copy = json.loads(json.dumps(data, default=str))
    with open(path, 'w') as f:
        json.dump(data_copy, f, indent=4)

# Load initial data
users_data = load_data('users.json', {})
chats_data = load_data('chats.json', [])
moods_data = load_data('moods.json', [])
notes_data = load_data('notes.json', [])
admin_reports_data = load_data('admin_reports.json', [])

app = Flask(__name__)
CORS(app)

CATEGORY_STEPS = {
    'breathing': 'Sit comfortably and take deep, slow breaths. Inhale for 4, hold for 4, exhale for 6.',
    'sleep': 'Create a wind-down routine, avoid screens, and let your body relax before bedtime.',
    'gratitude': 'Write down three small things you are thankful for today and reflect on them.'
}

SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'Hindi',
    'te': 'Telugu'
}

RESPONSE_TEMPLATES = {
    'en': {
        'sad': {
            'opening': 'I hear that you are feeling sad right now.',
            'validate': 'Your feelings are real, and it is okay to feel this when life feels heavy.',
            'action': 'Try taking three slow breaths and naming one small thing that felt a little better today.',
            'support': 'If you want, share more about what is weighing on you and I can help with a simple next step.'
        },
        'anxious': {
            'opening': 'It sounds like worry and anxiety are taking up space for you.',
            'validate': 'This can feel overwhelming, especially when your mind keeps replaying the same concerns.',
            'action': 'Pause for a moment and try a grounding exercise: notice 5 things you can see, 4 things you can touch, 3 things you can hear.',
            'support': 'You are doing the right thing by reaching out and naming how you feel.'
        },
        'stressed': {
            'opening': 'You seem stressed and under pressure.',
            'validate': 'Stress can make everything feel heavier, even small tasks.',
            'action': 'Take a short break with slow breaths, drink some water, and remind yourself that one step at a time is enough.',
            'support': 'It is okay to slow down and care for yourself right now.'
        },
        'lonely': {
            'opening': 'Feeling lonely can be hard, and I am glad you shared that.',
            'validate': 'Loneliness is a real experience, and your feelings matter.',
            'action': 'Try reaching out to one person, or write a few words about how you are feeling to help clear your mind.',
            'support': 'I am here to listen whenever you need to talk.'
        },
        'sleep': {
            'opening': 'Sleep issues can make everything else feel harder.',
            'validate': 'When rest is poor, the mind and body both struggle.',
            'action': 'Create a soothing bedtime routine and avoid screens for 30 minutes before bed.',
            'support': 'A calm evening routine can help your body prepare to relax.'
        },
        'motivated': {
            'opening': 'You are looking for motivation, and that is a strong first step.',
            'validate': 'It is normal to have days when energy feels low.',
            'action': 'Choose one small, positive action you can do right now and celebrate that progress.',
            'support': 'Small wins add up, so start with one manageable step.'
        },
        'angry': {
            'opening': 'I can hear some anger in your words.',
            'validate': 'Anger is a valid emotion, especially when things feel unfair or stressful.',
            'action': 'Try breathing slowly and describe what you are feeling in a calm sentence, even if just to yourself.',
            'support': 'Notice how your body responds, and allow yourself to respond without judgment.'
        },
        'general': {
            'opening': [
                'I am here to support you with kindness and practical care.',
                'I am listening, and I want to help you feel a little steadier in this moment.',
                'You are not alone in this, and I am here to help with a calm response.'
            ],
            'validate': [
                'Your experience matters, and it is okay to ask for help.',
                'It makes sense to feel uncertain right now, and that feeling is valid.',
                'This moment is important, and your feelings deserve attention.'
            ],
            'action': [
                'Describe one small thing you can do right now to feel a bit calmer or more grounded.',
                'Try one simple step to reconnect with what feels safe, such as breathing slowly or taking a short walk.',
                'Notice one thing in the room around you and name it silently to help the mind settle.'
            ],
            'support': [
                'Sharing more will help me give you a better, more specific suggestion.',
                'Tell me a little more and I can offer a practical next step that fits your situation.',
                'If you share one detail of what you are feeling, I can guide you more clearly.'
            ]
        }
    },
    'hi': {
        'sad': {
            'opening': 'मैं सुन सकता हूँ कि आप अभी उदास महसूस कर रहे हैं।',
            'validate': 'जब जीवन भारी लगे तो ऐसा महसूस करना बिल्कुल स्वाभाविक है।',
            'action': 'धीरे से तीन गहरी सांस लें और आज की कोई छोटी अच्छी बात याद करें।',
            'support': 'अगर आप चाहें तो मुझे और बताइए, मैं आपकी मदद के लिए यहाँ हूँ।'
        },
        'anxious': {
            'opening': 'ऐसा लगता है कि चिंता और घबराहट आपके साथ हैं।',
            'validate': 'यह भारी हो सकता है, विशेषकर जब दिमाग बार-बार एक ही बात पर घूमे।',
            'action': 'अब पांच चीज़ें देखें, चार चीज़ें छुएँ, तीन चीज़ें सुनें।',
            'support': 'आपने अपनी भावनाओं को साझा करके अच्छा कदम उठाया है।'
        },
        'stressed': {
            'opening': 'आप तनाव महसूस कर रहे हैं।',
            'validate': 'तनाव चीज़ों को और मुश्किल बना देता है।',
            'action': 'एक छोटा ब्रेक लें, गहरी साँसे लें और खुद से कहें कि एक-एक कदम काफी है।',
            'support': 'कुछ समय के लिए धीमा हो जाना और अपने लिए देखभाल करना ठीक है।'
        },
        'lonely': {
            'opening': 'अकेलेपन का अनुभव कठिन हो सकता है।',
            'validate': 'आपकी भावनाएँ मायने रखती हैं।',
            'action': 'किसी को संदेश भेजें या अपने विचार लिखें, इससे थोड़ा आराम मिल सकता है।',
            'support': 'मैं यहाँ हूँ और जब चाहें बात कर सकते हैं।'
        },
        'sleep': {
            'opening': 'नींद की समस्या आपके दिन को कठिन बना सकती है।',
            'validate': 'अच्छी नींद का न होना शरीर और मन दोनों को थका देता है।',
            'action': 'सोने से पहले स्क्रीन से दूर रहें और आरामदायक माहौल बनाएं।',
            'support': 'एक शांत शाम का रूटीन आपकी नींद में मदद कर सकता है।'
        },
        'motivated': {
            'opening': 'आप प्रेरणा ढूँढ़ रहे हैं, यह एक अच्छा कदम है।',
            'validate': 'हर दिन ऊर्जा अलग हो सकती है।',
            'action': 'एक छोटा लक्ष्य चुनें और उसे पूरा करने पर अपनी तारीफ करें।',
            'support': 'छोटे कदम भी बड़ी प्रगति में बदल सकते हैं।'
        },
        'angry': {
            'opening': 'मैं आपकी गुस्से की भावना सुन सकता हूँ।',
            'validate': 'गुस्सा वैध भावना है, खासकर जब चीज़ें कठिन हों।',
            'action': 'धीरे साँस लें और शांत होकर लिखने की कोशिश करें कि आप क्या महसूस कर रहे हैं।',
            'support': 'अपने आप को दोष मत दें, बस महसूस करें और आगे बढ़ने की कोशिश करें।'
        },
        'general': {
            'opening': 'मैं आपकी सहायता के लिए यहाँ हूँ।',
            'validate': 'आपकी स्थिति महत्वपूर्ण है और आपकी भावनाएँ उचित हैं।',
            'action': 'कृपया एक छोटी सी अच्छी बात लिखें जो आज आपके दिन में आई हो।',
            'support': 'और बताइए, ताकि मैं आपको और बेहतर सलाह दे सकूँ।'
        }
    },
    'te': {
        'sad': {
            'opening': 'మీకు ఇప్పుడు నెమ్మదిగా బాధగా ఉందని నేను గుర్తిస్తున్నాను.',
            'validate': 'జీవితం బరువుగా అనిపించినప్పుడు ఈ భావన సహజమే.',
            'action': 'మూడు దీర్ఘ శ్వాసలు తీసుకోండి మరియు ఈ రోజులో ఒక చిన్న మంచి విషయాన్ని గుర్తు చేసుకోండి.',
            'support': 'మీరు ఇంకా చెప్పాలనుకుంటే, నేను ఇక్కడనే ఉన్నాను.'
        },
        'anxious': {
            'opening': 'మీకు ఆందోళన అట్టడువతో ఉంది.',
            'validate': 'దీనిని అనుభవించడం భయం కాదు, ఇది చాలా సాధారణం.',
            'action': '5 విషయాలను చూడండి, 4 విషయాలను తోట్చండి, 3 శబ్దాలను వినండి.',
            'support': 'మీ భావాలను చేర్చడం ఒక మంచి మొదలు.'
        },
        'stressed': {
            'opening': 'మీరు ఒత్తిడిని అనుభవిస్తున్నారు.',
            'validate': 'ఒత్తిడి జీవితం లో ప్రతీ చిన్న విషయం ను పెద్దదిగా మారుస్తుంది.',
            'action': 'కొంచెం విశ్రాంతి తీసుకోండి, మెల్లగా శ్వాస తీసుకోండి మరియు మీకు ఇప్పుడు సరిపడేదే చేసుకోండి.',
            'support': 'మీరు ఇప్పుడు స్వయంకి శ్రద్ధ తీసుకోవడం సరే.'
        },
        'lonely': {
            'opening': 'అకలితనం కనిపించటం క్లిష్టం.',
            'validate': 'మీ భావాలు నిజమైనవి మరియు విలువైనవి.',
            'action': 'ఒకరితో మాట్లాడండి లేదా మీ భావాలను నోట్స్ లో రాయండి.',
            'support': 'నేను మీకు వినడానికి సిద్ధంగా ఉన్నాను.'
        },
        'sleep': {
            'opening': 'నిద్ర సమస్యలు మీ రోజును కష్టం చేస్తాయి.',
            'validate': 'బాగా విశ్రాంతి పొందలేకపోతే, శరీరం ఇంకా అలసిపోతుంది.',
            'action': 'బెడ్‌టైంకు ముందు స్క్రీన్ల నుంచి దూరంగా ఉండండి మరియు ఒక శాంతమైన వాతావరణం తయారుచేసుకోండి.',
            'support': 'శాంతమైన రాత్రి అలవాటు మీకు మంచి నిద్ర ఇవ్వగలదు.'
        },
        'motivated': {
            'opening': 'మీరు ప్రేరణ కోసం చూస్తున్నారు, ఇది మంచి మొదటి అడుగు.',
            'validate': 'ప్రతి రోజు మనశ్శక్తి వేరుగా ఉంటుంది.',
            'action': 'ఇప్పుడే ఒక చిన్న లక్ష్యాన్ని ఎంచుకోండి మరియు దాన్ని పూర్తి చేయడానికి ప్రయత్నించండి.',
            'support': 'చిన్న విజయం కూడా మీకు స్ఫూర్తిని అందిస్తుంది.'
        },
        'angry': {
            'opening': 'మీలో కోపం ఉంది అని నేను గమనిస్తున్నాను.',
            'validate': 'కోపం ఒక సహజమైన భావన, ఇది కూడగలదు.',
            'action': 'మెల్లగా ఊపిరి తీసుకోండి మరియు మీ అనుభూతిని ఒక సాదా వాక్యంలో వ్రాయండి.',
            'support': 'మీ భావాలను అంగీకరించడం మీకు ఉపశమనం కలిగిస్తుంది.'
        },
        'general': {
            'opening': 'నేను మీకు మద్దతుగా ఉన్నాను.',
            'validate': 'మీ అనుభవం ముఖ్యమైనది మరియు మీ భావాలు సరైనవి.',
            'action': 'ఇప్పుడే మీకు ఒక మంచి విషయం గురించి చెప్పండి.',
            'support': 'మరిన్ని వివరాలు ఐతే, నేను మీరు కోసం మరింత సహాయకరంగా ఉండగలను.'
        }
    }
}

OPENAI_ENABLED = bool(OPENAI_API_KEY)

# Psychology Questions Database based on PDF
PSYCHOLOGY_QUESTIONS_DB = {
    'greeting': [
        'How are you feeling today?',
        'What brings you here today?',
        'Tell me about your current emotional state.',
        'How has your day been treating you?'
    ],
    'mood_follow_up': {
        'sad': [
            'What has been affecting your emotions recently?',
            'How long have you been feeling this way?',
            'What has been weighing on your mind?',
            'Can you share what triggered this sadness?'
        ],
        'anxious': [
            'What is making you anxious?',
            'What specific worries are on your mind?',
            'When does this anxiety typically occur?',
            'What are you most concerned about right now?'
        ],
        'angry': [
            'What is frustrating you?',
            'What situation made you angry?',
            'How are you feeling about this?',
            'What would help you feel better?'
        ],
        'lonely': [
            'Do you feel lonely?',
            'What makes you feel isolated?',
            'Who do you wish you could talk to?',
            'How long have you felt this way?'
        ],
        'stressed': [
            'What helps you relax?',
            'What is stressing you the most?',
            'How do you usually handle stress?',
            'What would ease your stress?'
        ],
        'happy': [
            'What made you feel happy today?',
            'What are you grateful for?',
            'Tell me about something positive that happened.',
            'What brings you joy?'
        ]
    },
    'supporting_questions': [
        'Do you overthink often?',
        'How do you usually cope with difficult emotions?',
        'Have you experienced this before?',
        'What support do you have around you?',
        'What would help you feel better right now?',
        'Have you talked to anyone about this?',
        'What are your go-to calming techniques?',
        'How is this affecting your daily life?'
    ],
    'breathing_exercises': [
        {
            'name': '4-7-8 Breathing',
            'description': 'Calming technique for anxiety and stress',
            'steps': [
                'Find a comfortable position',
                'Inhale through your nose for a count of 4',
                'Hold your breath for a count of 7',
                'Exhale slowly through your mouth for a count of 8',
                'Repeat 4-8 times'
            ]
        },
        {
            'name': 'Box Breathing',
            'description': 'Grounding exercise for panic attacks',
            'steps': [
                'Sit quietly and focus on your breath',
                'Inhale for a count of 4',
                'Hold for a count of 4',
                'Exhale for a count of 4',
                'Hold for a count of 4',
                'Repeat 5-10 times'
            ]
        },
        {
            'name': 'Diaphragmatic Breathing',
            'description': 'Deep breathing for relaxation',
            'steps': [
                'Lie down or sit comfortably',
                'Place one hand on your chest, one on your belly',
                'Breathe in deeply through your nose so your belly rises',
                'Exhale slowly through your mouth',
                'Focus on belly movement, not chest',
                'Continue for 5-10 minutes'
            ]
        }
    ],
    'wellness_suggestions': [
        'breathing exercises',
        'calming music suggestions',
        'journaling prompts',
        'motivational support',
        'meditation guidance',
        'grounding techniques'
    ]
}

# Journal data file
journals_data = load_data('journals.json', [])
breathing_records = load_data('breathing_records.json', [])


def normalize_language(language_code):
    if not language_code:
        return 'en'
    language_code = language_code.lower()
    if language_code.startswith('hi'):
        return 'hi'
    if language_code.startswith('te'):
        return 'te'
    return 'en'


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = users_data.get(payload['email'])
            if not current_user:
                raise Exception('User not found')
        except Exception as e:
            return jsonify({'error': 'Token is invalid.', 'message': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated


def choose_response_topic(text):
    text = text.lower()
    if any(word in text for word in ['sad', 'depressed', 'down', 'hopeless', 'unhappy', 'cry']):
        return 'sad'
    if any(word in text for word in ['anxious', 'anxiety', 'panic', 'worried', 'fear']):
        return 'anxious'
    if any(word in text for word in ['stress', 'stressed', 'overwhelmed', 'pressure']):
        return 'stressed'
    if any(word in text for word in ['lonely', 'alone', 'isolated']):
        return 'lonely'
    if any(word in text for word in ['sleep', 'insomnia', 'restless', 'tired']):
        return 'sleep'
    if any(word in text for word in ['motivate', 'motivation', 'energy', 'drive']):
        return 'motivated'
    if any(word in text for word in ['angry', 'anger', 'frustrated', 'mad']):
        return 'angry'
    return 'general'


FAQ_RESPONSES = {
    'stressed': 'Stress can feel overwhelming sometimes. Try focusing on one small task at a time and give yourself short breaks to relax.',
    'stress': 'Stress can feel overwhelming sometimes. Try focusing on one small task at a time and give yourself short breaks to relax.',
    'cannot sleep': 'Sleep problems are common during stress. Reducing screen time before bed and keeping a calm routine may help.',
    'sleep properly': 'Sleep problems are common during stress. Reducing screen time before bed and keeping a calm routine may help.',
    'sleep issues': 'Sleep problems are common during stress. Reducing screen time before bed and keeping a calm routine may help.',
    'nervous': 'Feeling nervous can happen during uncertain situations. Slow breathing and grounding techniques may help calm your mind.',
    'worried about my future': 'Many people worry about the future. Try focusing on what you can control today rather than everything at once.',
    'panic before exams': 'Exam pressure is common. Preparing step-by-step and taking regular breaks can help reduce panic.',
    'panic': 'Exam pressure is common. Preparing step-by-step and taking regular breaks can help reduce panic.',
    'overthink': 'Overthinking can be exhausting. Writing down your thoughts may help organize them more clearly.',
    'pressure from everyone': 'Too much pressure can feel heavy. Remember that your well-being is also important.',
    'mentally tired': 'Mental exhaustion can happen after continuous stress. Taking rest and doing calming activities may help recharge you.',
    'afraid of failure': 'Failure is a part of learning and growth. Every experience can teach something valuable.',
    'anxious in social situations': 'Social anxiety is more common than many people realize. Small social interactions can help build confidence gradually.',
    'sad today': 'I’m sorry you’re feeling sad. Sometimes sharing your feelings with someone supportive can help lighten the emotional load.',
    'lonely': 'Loneliness can feel difficult. Connecting with a trusted person or joining activities you enjoy may help.',
    'nobody understands me': 'Feeling misunderstood can hurt. Your feelings are still important and deserve to be heard.',
    'cry easily': 'Crying is a natural emotional response and can sometimes help release stress.',
    'empty inside': 'Feeling emotionally empty can happen during stressful periods. Small routines and meaningful activities may help slowly reconnect you.',
    'miss someone': 'Missing someone deeply is natural when they matter to you. Memories and support from others can help during that time.',
    'feel ignored': 'Feeling ignored can be painful. Your thoughts and emotions still matter.',
    'emotionally weak': 'Everyone has emotionally difficult moments. Reaching out for support can be a strong step.',
    'disappointed in myself': 'Disappointment happens to everyone sometimes. One difficult moment does not define your worth.',
    'giving up on my goals': 'Goals can feel hard during stressful times. Taking one small step at a time may make things feel more manageable.',
    'low confidence': 'Confidence usually grows slowly through practice, learning, and small achievements.',
    'compare myself': 'Comparing yourself constantly can hurt your confidence. Everyone progresses differently.',
    'not good enough': 'Your value is not decided by one mistake or one difficult period.',
    'insecure': 'Insecurity is common. Focusing on your strengths and progress may help build confidence gradually.',
    'shy around people': 'Shyness is normal for many people. Small conversations can slowly improve comfort levels.',
    'lack motivation': 'Motivation can come and go. Starting with one small task can help rebuild momentum.',
    'fear public speaking': 'Public speaking anxiety is common. Practice and preparation can help reduce fear over time.',
    'doubt my abilities': 'Self-doubt happens to many people, especially during challenges. Remember your past achievements too.',
    'behind in life': 'Everyone’s journey is different. Progress does not need to happen at the same speed for everyone.',
    'unattractive': 'Self-worth is much more than appearance. Your personality, skills, and kindness matter too.',
    'get angry quickly': 'Strong emotions can build up during stress. Taking a pause before reacting may help.',
    'regret things i said': 'Many people regret emotional reactions. Reflecting and apologizing when needed can help repair situations.',
    'frustrated': 'Frustration often comes from blocked goals or stress. Taking a short break may help clear your mind.',
    'cannot control my emotions': 'Emotions can feel intense sometimes. Slowing down and identifying the feeling may help manage it better.',
    'irritated all the time': 'Continuous irritation may happen during exhaustion or stress. Proper rest and relaxation can help.',
    'friends avoid me': 'Relationship changes can feel painful. Honest communication may help clarify misunderstandings.',
    'had a fight': 'Conflicts happen in relationships. Calm conversations later can sometimes improve understanding.',
    'left out': 'Feeling excluded can hurt emotionally. Finding supportive people and activities may help.',
    'do not trust people': 'Trust often develops gradually through consistent and respectful interactions.',
    'awkward in conversations': 'Social awkwardness is common. Practice and patience usually improve communication skills.',
    'stressed about exams': 'Exam stress is common. A balanced study plan and proper rest may help improve focus.',
    'fear failing my exams': 'Fear of failure can increase pressure. Focus on preparation rather than perfection.',
    'cannot concentrate on studies': 'Distractions and stress can affect concentration. Short focused study sessions may help.',
    'confused about my career': 'Career confusion is common during learning stages. Exploring interests and skills may help guide decisions.',
    'pressure to succeed': 'Success pressure can become exhausting. Your health and well-being are also important.',
    'want to improve myself': 'Self-improvement starts with small consistent habits and patience with yourself.',
    'procrastinate': 'Breaking tasks into smaller steps may make them easier to start.',
    'lose focus quickly': 'Short breaks and reducing distractions can sometimes improve focus.',
    'want to become mentally stronger': 'Mental strength grows through learning, resilience, and healthy coping habits.',
    'want a positive mindset': 'Positive thinking often develops through gratitude, healthy routines, and self-care.',
    'feel confused': 'Taking time to think calmly may help organize your thoughts.',
    'feel tired emotionally': 'Emotional exhaustion can improve with rest and support.',
    'feel alone': 'You deserve connection and support.',
    'afraid of judgment': 'Many people worry about judgment sometimes.',
    'pressured by expectations': 'Balancing expectations and self-care is important.',
    'feel hopeless': 'Difficult feelings can change with time and support.',
    'homesick': 'Missing familiar people and places is natural.',
    'distracted easily': 'Short focused sessions may help improve attention.',
    'embarrassed often': 'Everyone experiences awkward moments sometimes.',
    'nervous speaking in class': 'Practice and preparation can build confidence.',
    'mentally blocked': 'Taking a break may help refresh your thinking.',
    'uncomfortable around strangers': 'Social comfort often improves gradually.',
    'exhausted from responsibilities': 'Rest and balance are important too.',
    'emotionally sensitive': 'Sensitivity can also reflect empathy and awareness.',
    'fear rejection': 'Rejection can hurt, but it does not define your worth.',
    'worry too much': 'Focusing on what you can control may help.',
    'insecure about my future': 'Uncertainty is part of growth and learning.',
    'struggle with discipline': 'Building routines slowly can help improve discipline.',
    'unproductive': 'Small progress still counts.',
    'emotionally disconnected': 'Meaningful activities and support may help reconnect you.',
    'weak mentally': 'Everyone has difficult emotional periods.',
    'scared of change': 'Change can feel uncomfortable at first.',
    'trapped by responsibilities': 'Taking small breaks can sometimes reduce pressure.',
    'worried constantly': 'Constant worry can become exhausting.',
    'pressure from family': 'Family expectations can sometimes feel overwhelming.',
    'emotionally confused': 'Understanding emotions takes time.',
    'guilty often': 'Learning from mistakes is more important than constant guilt.',
    'emotionally overwhelmed': 'Slowing down and resting may help.',
    'disconnected from friends': 'Communication may help rebuild connection.',
    'fear making mistakes': 'Mistakes are part of learning.',
    'discouraged': 'Temporary setbacks do not erase your progress.',
    'shy expressing feelings': 'Opening up gradually can help.',
    'pressure to be perfect': 'Perfection is unrealistic for everyone.',
    'nervous meeting new people': 'That feeling is very common.',
    'drained after social events': 'Taking quiet time afterward may help recharge.',
    'mentally overloaded': 'Organizing tasks step-by-step may reduce stress.',
    'emotionally unstable': 'Strong emotions can happen during stressful periods.',
    'uncomfortable with criticism': 'Constructive feedback can support growth.',
    'restless': 'Physical activity or breathing exercises may help.',
    'emotionally distant': 'Stress can sometimes affect emotional connection.',
    'impatient': 'Patience often improves with practice and awareness.',
    'anxious at night': 'Relaxation routines may help calm nighttime anxiety.',
    'worried about others’ opinions': 'Your value is not based only on others’ views.',
    'mentally exhausted from studying': 'Rest and healthy breaks are important.',
    'emotionally unsupported': 'Supportive conversations can make a difference.',
    'nervous before interviews': 'Preparation and practice may improve confidence.',
    'afraid to try again': 'Trying again after setbacks takes courage.',
    'emotionally stuck': 'Small changes in routine may help create movement.',
    'disconnected from myself': 'Self-reflection and rest may help reconnect you.',
    'emotionally overwhelmed by life': 'Taking one step at a time may make things feel more manageable.'
}


FAQ_PATTERNS = [
    (re.compile(r'\b(stress|stressed|overwhelmed|pressure|exam stress|exam pressure|burnout)\b'),
     'Stress is difficult, but small steps like breathing breaks, naming the feeling, and doing one manageable task can help you feel more grounded.'),
    (re.compile(r'\b(anxiety|anxious|panic|worry|worried)\b'),
     'Anxiety often comes from feeling unsafe or out of control. Try grounding with your senses and focusing on one small action you can take right now.'),
    (re.compile(r'\b(not myself|dont feel like myself|don t feel like myself|feel unlike myself|feel different)\b'),
     'Feeling unlike yourself can be unsettling. Try noticing one small thing that feels familiar or comforting, and reach out to someone you trust if you can.'),
    (re.compile(r'\b(sad|sadness|depressed|down|hopeless|empty)\b'),
     'Feeling sad is a real emotion. Validating it, reaching out to someone you trust, and doing one gentle self-care activity can help even a little.'),
    (re.compile(r'\b(lonely|alone|isolated|left out)\b'),
     'Loneliness can feel heavy. Connecting with someone safe, even briefly, or doing a comforting routine may help you feel less alone.'),
    (re.compile(r'\b(motivation|motivated|drive|energy|purpose)\b'),
     'Motivation often returns after a small start. Choose one tiny action to begin with and reward yourself for simply showing up.'),
    (re.compile(r'\b(confidence|confident|self\s*esteem|worth|insecure|not good enough)\b'),
     'Confidence is built slowly. Notice one thing you did well today and remind yourself it is okay to learn from mistakes.'),
    (re.compile(r'\b(sleep|insomnia|cannot sleep|trouble sleeping|restless night)\b'),
     'Sleep problems are common. Try a consistent wind-down routine and limit screen time before bed to help your mind relax.'),
    (re.compile(r'\b(relationship|partner|family|friend|friendship|communication|trust|fight|argument)\b'),
     'Relationships can be hard. Focus on honest listening, respectful boundaries, and sharing how you feel without blaming yourself.'),
    (re.compile(r'\b(study|exam|test|homework|school|college|career)\b'),
     'Academic pressure is stressful. Break work into small pieces, make a simple plan, and take short breaks so you do not burn out.'),
]


def normalize_message_text(message):
    normalized = message.lower().replace("'", '').replace('’', '')
    normalized = re.sub(r'[^a-z0-9\s]', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized


def match_exact_response(message):
    normalized = normalize_message_text(message)
    for keyword, answer in FAQ_RESPONSES.items():
        if normalize_message_text(keyword) in normalized:
            return answer
    for pattern, answer in FAQ_PATTERNS:
        if pattern.search(normalized):
            return answer
    return None


def get_conversation_messages(current_user, limit=5):
    user_chats = [chat for chat in chats_data if chat.get('email') == current_user['email']]
    sorted_chats = sorted(user_chats, key=lambda x: x['createdAt'], reverse=True)[:limit]
    messages = []
    for chat in reversed(sorted_chats):
        messages.append({'role': 'user', 'content': chat['message']})
        messages.append({'role': 'assistant', 'content': chat['reply']})
    return messages


def get_recent_chat_history(current_user, limit=5):
    user_chats = [chat for chat in chats_data if chat.get('email') == current_user['email']]
    sorted_chats = sorted(user_chats, key=lambda x: x['createdAt'], reverse=True)[:limit]
    history_lines = []
    for chat in reversed(sorted_chats):
        history_lines.append(f"User: {chat['message']}")
        history_lines.append(f"Assistant: {chat['reply']}")
    return '\n'.join(history_lines)


def choose_text_variant(value):
    if isinstance(value, list):
        return random.choice(value)
    return value


def analyze_user_behavior(message, history):
    words = message.split()
    length = len(words)
    
    if length <= 3:
        detail_style = 'brief'
    elif length >= 20:
        detail_style = 'detailed'
    else:
        detail_style = 'moderate'
        
    is_repeating = False
    if history and message.strip().lower() in history.lower():
        is_repeating = True
        
    return {
        'detail_style': detail_style,
        'is_repeating': is_repeating,
        'word_count': length
    }


def generate_local_response(message, mood, language, behavior_stats=None):
    exact_response = match_exact_response(message)
    if exact_response:
        return exact_response

    normalized = normalize_message_text(message)
    topic = choose_response_topic(message)
    messages_dict = RESPONSE_TEMPLATES.get(language, RESPONSE_TEMPLATES['en'])
    template = messages_dict.get(topic, messages_dict['general'])
    opening = choose_text_variant(template.get('opening'))
    validate = choose_text_variant(template.get('validate'))
    action = choose_text_variant(template.get('action'))
    support = choose_text_variant(template.get('support'))

    repeated_note = ''
    if behavior_stats and behavior_stats['is_repeating']:
        if language == 'en':
            repeated_note = ' I notice you are asking about this again, so let us try looking at it slightly differently.'
        elif language == 'hi':
            repeated_note = ' मैं देख रहा हूँ कि आप फिर से पूछ रहे हैं, तो चलिए इसे थोड़ा अलग तरीके से देखते हैं।'
        elif language == 'te':
            repeated_note = ' మీరు దీని గురించి మళ్ళీ అడుగుతున్నారని నేను గమనించాను, కాబట్టి దీనిని కొంచెం భిన్నంగా చూద్దాం.'

    behavior_prefix = ''
    behavior_suffix = ''

    if behavior_stats:
        if behavior_stats['detail_style'] == 'brief':
            if language == 'en':
                behavior_suffix = ' Can you tell me a bit more about what brought this on?'
            elif language == 'hi':
                behavior_suffix = ' क्या आप मुझे थोड़ा और बता सकते हैं कि ऐसा क्यों हो रहा है?'
            elif language == 'te':
                behavior_suffix = ' దీనికి కారణం ఏమిటో కాస్త వివరిస్తారా?'
        elif behavior_stats['detail_style'] == 'detailed':
            if language == 'en':
                behavior_prefix = 'Thank you for expressing yourself so thoroughly. '
                behavior_suffix = ' How long have you been feeling this heavy burden?'
            elif language == 'hi':
                behavior_prefix = 'इतनी विस्तार से अपनी बात रखने के लिए धन्यवाद। '
                behavior_suffix = ' आप कब से इस भारीपन को महसूस कर रहे हैं?'
            elif language == 'te':
                behavior_prefix = 'ఇంత వివరంగా చెప్పినందుకు ధన్యవాదాలు. '
                behavior_suffix = ' మీరు ఎంతకాలంగా ఈ భారాన్ని అనుభవిస్తున్నారు?'
        else:
            if language == 'en':
                behavior_suffix = ' What is the hardest part of this for you right now?'
            elif language == 'hi':
                behavior_suffix = ' अभी आपके लिए इसमें सबसे कठिन हिस्सा क्या है?'
            elif language == 'te':
                behavior_suffix = ' ప్రస్తుతం ఇందులో మీకు అత్యంత కష్టంగా ఉన్న భాగం ఏమిటి?'

    return (
        f"{behavior_prefix}{opening} {validate}{repeated_note}\n\n"
        f"{action}\n\n"
        f"{support}{behavior_suffix}"
    )


def build_ai_prompt(message, mood, language, history='', behavior_stats=None):
    language_name = SUPPORTED_LANGUAGES.get(language, 'English')
    
    style_instruction = ""
    if behavior_stats:
        if behavior_stats['detail_style'] == 'brief':
            style_instruction = "The user sent a very short message. Respond with a warm, concise answer and gently encourage them to share more by asking an exploratory question. "
        elif behavior_stats['detail_style'] == 'detailed':
            style_instruction = "The user has shared a detailed and expressive message. Acknowledge the depth of their sharing, validate their complex feelings, and ask a specific follow-up question to deepen the therapeutic dialogue. "
        else:
            style_instruction = "Provide a balanced, empathetic response with a practical suggestion, and end by asking a relevant question about their experience. "
            
        if behavior_stats['is_repeating']:
            style_instruction += "The user seems to be repeating a similar point from before. Acknowledge this gently and ask them to elaborate on why this particular feeling is persisting. "

    history_block = f"\n\nRecent conversation history:\n{history}\n" if history else ''
    return (
        f"You are a highly skilled clinical psychology doctor with 15 years of experience. You specialize in diagnosing and treating psychological conditions using CBT (Cognitive Behavioral Therapy). "
        f"Respond in {language_name}. Use simple, clear language. "
        f"Focus only on the user’s current message and recent chat history. Do not include unrelated advice or generic small talk. "
        f"Always answer based on the user’s exact request and the emotional keywords they used. "
        f"If the request matches a known topic such as stress, sleep, anxiety, sadness, loneliness, exam pressure, motivation, confidence, or relationships, answer that topic directly. "
        f"Validate the user’s feeling, summarize what they said, and ALWAYS ask one relevant, probing question to better understand their condition and encourage dialogue. "
        f"Use the recent conversation history when it helps keep the response consistent. "
        f"{style_instruction}"
        f"{history_block}"
        f"The user's current mood is {mood}. "
        f"User message: {message}. "
        f"Write a helpful answer in {language_name}."
    )


def generate_token(user):
    payload = {
        'email': user['email'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def sentiment_from_text(text):
    text_lower = text.lower()
    if any(word in text_lower for word in ['sad', 'anxiety', 'stress', 'lonely', 'overwhelmed', 'panic']):
        return 'challenged'
    if any(word in text_lower for word in ['happy', 'calm', 'good', 'grateful', 'motivated']):
        return 'positive'
    return 'neutral'


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')
    if not email or not password or not name:
        return jsonify({'error': 'Name, email, and password are required.'}), 400
    if email in users_data:
        return jsonify({'error': 'Email already registered.'}), 400
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    user = {
        'name': name,
        'email': email,
        'password': password_hash.decode('utf-8'),  # Store as string for JSON
        'createdAt': datetime.datetime.utcnow(),
        'lastLogin': None,
        'lastLogout': None,
        'role': 'user',
        'profile': {
            'language': 'en',
            'wellnessScore': 78,
            'favoriteActivities': []
        }
    }
    users_data[email] = user
    save_data('users.json', users_data)
    token = generate_token(user)
    return jsonify({'token': token, 'user': {'email': email, 'name': name}})


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    user = users_data.get(email)
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({'error': 'Invalid credentials.'}), 401
    user['lastLogin'] = datetime.datetime.utcnow()
    save_data('users.json', users_data)
    token = generate_token(user)
    return jsonify({'token': token, 'user': {'email': email, 'name': user['name'], 'role': user.get('role', 'user'), 'profile': user.get('profile', {})}})


@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout(current_user):
    current_user['lastLogout'] = datetime.datetime.utcnow()
    save_data('users.json', users_data)
    return jsonify({'message': 'Logged out successfully.'})


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email required.'}), 400
    user = users_data.get(email)
    if not user:
        return jsonify({'message': 'If the email is registered, a reset link has been sent.'})
    token = jwt.encode({
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRY_HOURS)
    }, JWT_SECRET, algorithm='HS256')
    user['resetToken'] = token
    user['resetExpires'] = datetime.datetime.utcnow() + datetime.timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRY_HOURS)
    save_data('users.json', users_data)
    return jsonify({'message': 'Password reset token generated. Use /api/auth/reset-password to complete the flow.', 'resetToken': token})


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    token = data.get('token')
    password = data.get('password')
    if not token or not password:
        return jsonify({'error': 'Token and new password are required.'}), 400
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        email = payload['email']
    except Exception:
        return jsonify({'error': 'Invalid or expired token.'}), 401
    user = users_data.get(email)
    if not user or user.get('resetToken') != token:
        return jsonify({'error': 'Invalid reset token.'}), 401
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user['password'] = password_hash
    if 'resetToken' in user:
        del user['resetToken']
    if 'resetExpires' in user:
        del user['resetExpires']
    save_data('users.json', users_data)
    return jsonify({'message': 'Password has been reset successfully.'})


@app.route('/api/profile', methods=['GET'])
@token_required
def profile(current_user):
    return jsonify({
        'profile': current_user.get('profile', {}),
        'email': current_user['email'],
        'name': current_user['name'],
        'role': current_user.get('role', 'user')
    })


@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.json or {}
    profile_updates = data.get('profile', {})
    current_user['profile'] = profile_updates
    save_data('users.json', users_data)
    return jsonify({'message': 'Profile updated.'})


@app.route('/api/mood', methods=['POST'])
@token_required
def add_mood(current_user):
    data = request.json or {}
    mood = data.get('mood')
    note = data.get('note', '')
    if not mood:
        return jsonify({'error': 'Mood selection required.'}), 400
    mood_record = {
        'email': current_user['email'],
        'mood': mood,
        'note': note,
        'createdAt': datetime.datetime.utcnow()
    }
    moods_data.append(mood_record)
    save_data('moods.json', moods_data)
    return jsonify({'message': 'Mood saved.', 'mood': mood_record})


@app.route('/api/mood/history', methods=['GET'])
@token_required
def mood_history(current_user):
    user_moods = [r for r in moods_data if r['email'] == current_user['email']]
    sorted_moods = sorted(user_moods, key=lambda x: x['createdAt'], reverse=True)[:50]
    for r in sorted_moods:
        r['createdAt'] = r['createdAt'].isoformat()
    return jsonify({'history': sorted_moods})


@app.route('/api/chat', methods=['POST'])
@token_required
def chat(current_user):
    data = request.json or {}
    message = data.get('message', '')
    mood = data.get('mood', 'neutral')
    requested_language = normalize_language(data.get('language') or current_user.get('profile', {}).get('language', 'en'))
    sentiment = sentiment_from_text(message)
    reply = None
    history = get_recent_chat_history(current_user, limit=5)
    
    behavior_stats = analyze_user_behavior(message, history)

    if OPENAI_ENABLED:
        try:
            prompt = build_ai_prompt(message, mood, requested_language, history=history, behavior_stats=behavior_stats)
            conversation_messages = get_conversation_messages(current_user, limit=5)
            response = openai.ChatCompletion.create(
                model=OPENAI_MODEL,
                messages=[
                    {'role': 'system', 'content': prompt},
                    *conversation_messages,
                    {'role': 'user', 'content': message}
                ],
                max_tokens=300,
                temperature=0.75,
                top_p=0.85,
                frequency_penalty=0.3,
                presence_penalty=0.1
            )
            reply = response.choices[0].message.content.strip()
        except Exception:
            reply = generate_local_response(message, mood, requested_language, behavior_stats=behavior_stats)
    else:
        reply = generate_local_response(message, mood, requested_language, behavior_stats=behavior_stats)

    chat_doc = {
        'email': current_user['email'],
        'message': message,
        'reply': reply,
        'mood': mood,
        'sentiment': sentiment,
        'language': requested_language,
        'createdAt': datetime.datetime.utcnow()
    }
    chats_data.append(chat_doc)
    save_data('chats.json', chats_data)
    return jsonify({
        'reply': reply,
        'sentiment': sentiment,
        'language': requested_language,
        'recommendation': CATEGORY_STEPS.get('breathing')
    })


@app.route('/api/chat/history', methods=['GET'])
@token_required
def chat_history(current_user):
    user_chats = [chat for chat in chats_data if chat.get('email') == current_user['email']]
    sorted_chats = sorted(user_chats, key=lambda x: x['createdAt'], reverse=True)
    for chat in sorted_chats:
        chat['createdAt'] = chat['createdAt'].isoformat()
    return jsonify({'history': sorted_chats})


@app.route('/api/wellness', methods=['GET'])
@token_required
def wellness_tools(current_user):
    now = datetime.datetime.utcnow()
    quote_list = [
        'A healthy mind is a peaceful mind.',
        'Every step toward self-care is strength.',
        'Breathe. Reflect. Be gentle with yourself.'
    ]
    return jsonify({
        'quote': quote_list[now.day % len(quote_list)],
        'affirmation': 'You are allowed to take moments for yourself today.',
        'tips': [
            'Try a 5-minute grounding exercise.',
            'Write one thing you accomplished today.',
            'Take a break from screens and breathe deeply.'
        ]
    })


@app.route('/api/admin/users', methods=['GET'])
@token_required
def admin_users(current_user):
    if current_user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    user_list = []
    for user in users_data.values():
        user_list.append({'email': user['email'], 'name': user['name'], 'role': user.get('role', 'user'), 'createdAt': user['createdAt'].isoformat() if user.get('createdAt') else ''})
    return jsonify({'users': user_list})


@app.route('/api/admin/analytics', methods=['GET'])
@token_required
def admin_analytics(current_user):
    if current_user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    total_users = len(users_data)
    total_chats = len(chats_data)
    today = datetime.datetime.utcnow().date()
    today_logins = sum(
        1 for user in users_data.values()
        if user.get('lastLogin') and getattr(user['lastLogin'], 'date', lambda: None)() == today
    )
    today_logouts = sum(
        1 for user in users_data.values()
        if user.get('lastLogout') and getattr(user['lastLogout'], 'date', lambda: None)() == today
    )
    
    # Mood statistics
    mood_counts = {}
    for mood_record in moods_data:
        mood = mood_record.get('mood', 'neutral')
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    # Sentiment statistics
    sentiment_counts = {}
    for chat in chats_data:
        sentiment = chat.get('sentiment', 'neutral')
        sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
    
    return jsonify({
        'totalUsers': total_users,
        'totalChats': total_chats,
        'totalMoodEntries': len(moods_data),
        'todayLogins': today_logins,
        'todayLogouts': today_logouts,
        'moodStatistics': mood_counts,
        'sentimentStatistics': sentiment_counts
    })


@app.route('/api/admin/mood-analytics', methods=['GET'])
@token_required
def admin_mood_analytics(current_user):
    if current_user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    
    mood_by_user = {}
    for mood_record in moods_data:
        email = mood_record.get('email')
        mood = mood_record.get('mood')
        if email not in mood_by_user:
            mood_by_user[email] = {}
        mood_by_user[email][mood] = mood_by_user[email].get(mood, 0) + 1
    
    # Daily mood trends
    daily_trends = {}
    for mood_record in moods_data:
        date = mood_record.get('createdAt', datetime.datetime.utcnow()).date()
        if str(date) not in daily_trends:
            daily_trends[str(date)] = {}
        mood = mood_record.get('mood', 'neutral')
        daily_trends[str(date)][mood] = daily_trends[str(date)].get(mood, 0) + 1
    
    return jsonify({
        'moodByUser': mood_by_user,
        'dailyTrends': daily_trends
    })


@app.route('/api/admin/conversation-logs', methods=['GET'])
@token_required
def admin_conversation_logs(current_user):
    if current_user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    
    user_email = request.args.get('email')
    limit = int(request.args.get('limit', 100))
    
    if user_email:
        conversations = [c for c in chats_data if c.get('email') == user_email]
    else:
        conversations = chats_data
    
    sorted_convs = sorted(conversations, key=lambda x: x['createdAt'], reverse=True)[:limit]
    for conv in sorted_convs:
        conv['createdAt'] = conv['createdAt'].isoformat()
    
    return jsonify({'logs': sorted_convs})


@app.route('/api/admin/export-report', methods=['GET'])
@token_required
def admin_export_report(current_user):
    if current_user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    
    report_type = request.args.get('type', 'full')
    
    report = {
        'generatedAt': datetime.datetime.utcnow().isoformat(),
        'reportType': report_type,
        'data': {}
    }
    
    if report_type in ['full', 'users']:
        report['data']['users'] = len(users_data)
        report['data']['userDetails'] = [
            {
                'email': user['email'],
                'name': user['name'],
                'role': user.get('role', 'user'),
                'createdAt': user['createdAt'].isoformat() if user.get('createdAt') else '',
                'lastLogin': user.get('lastLogin', '').isoformat() if user.get('lastLogin') else ''
            }
            for user in users_data.values()
        ]
    
    if report_type in ['full', 'moods']:
        mood_counts = {}
        for mood_record in moods_data:
            mood = mood_record.get('mood', 'neutral')
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
        report['data']['totalMoods'] = len(moods_data)
        report['data']['moodDistribution'] = mood_counts
    
    if report_type in ['full', 'chats']:
        report['data']['totalChats'] = len(chats_data)
        sentiment_counts = {}
        for chat in chats_data:
            sentiment = chat.get('sentiment', 'neutral')
            sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
        report['data']['sentimentDistribution'] = sentiment_counts
    
    if report_type in ['full', 'journals']:
        user_journals = {}
        for journal in journals_data:
            email = journal.get('email')
            if email not in user_journals:
                user_journals[email] = 0
            user_journals[email] += 1
        report['data']['totalJournals'] = len(journals_data)
        report['data']['journalsByUser'] = user_journals
    
    return jsonify(report)


# ============= Journaling Endpoints =============

@app.route('/api/journal', methods=['POST'])
@token_required
def create_journal(current_user):
    data = request.json or {}
    title = data.get('title', '')
    content = data.get('content', '')
    mood = data.get('mood', 'neutral')
    
    if not title or not content:
        return jsonify({'error': 'Title and content are required.'}), 400
    
    journal_entry = {
        'email': current_user['email'],
        'title': title,
        'content': content,
        'mood': mood,
        'createdAt': datetime.datetime.utcnow()
    }
    journals_data.append(journal_entry)
    save_data('journals.json', journals_data)
    
    return jsonify({
        'message': 'Journal entry saved.',
        'entry': journal_entry
    })


@app.route('/api/journal/history', methods=['GET'])
@token_required
def journal_history(current_user):
    user_journals = [j for j in journals_data if j.get('email') == current_user['email']]
    sorted_journals = sorted(user_journals, key=lambda x: x['createdAt'], reverse=True)
    for journal in sorted_journals:
        journal['createdAt'] = journal['createdAt'].isoformat()
    
    return jsonify({'journals': sorted_journals})


@app.route('/api/journal/<int:index>', methods=['GET'])
@token_required
def get_journal(current_user, index):
    user_journals = [j for j in journals_data if j.get('email') == current_user['email']]
    sorted_journals = sorted(user_journals, key=lambda x: x['createdAt'], reverse=True)
    
    if index < 0 or index >= len(sorted_journals):
        return jsonify({'error': 'Journal not found.'}), 404
    
    journal = sorted_journals[index]
    journal['createdAt'] = journal['createdAt'].isoformat()
    return jsonify(journal)


# ============= Breathing Exercises Endpoints =============

@app.route('/api/breathing/exercises', methods=['GET'])
@token_required
def get_breathing_exercises(current_user):
    return jsonify({
        'exercises': PSYCHOLOGY_QUESTIONS_DB['breathing_exercises']
    })


@app.route('/api/breathing/complete', methods=['POST'])
@token_required
def complete_breathing_exercise(current_user):
    data = request.json or {}
    exercise_name = data.get('exerciseName', '')
    duration = data.get('duration', 0)
    
    if not exercise_name:
        return jsonify({'error': 'Exercise name required.'}), 400
    
    record = {
        'email': current_user['email'],
        'exerciseName': exercise_name,
        'duration': duration,
        'createdAt': datetime.datetime.utcnow()
    }
    breathing_records.append(record)
    save_data('breathing_records.json', breathing_records)
    
    return jsonify({
        'message': 'Breathing exercise recorded.',
        'record': record
    })


@app.route('/api/breathing/history', methods=['GET'])
@token_required
def breathing_history(current_user):
    user_records = [r for r in breathing_records if r.get('email') == current_user['email']]
    sorted_records = sorted(user_records, key=lambda x: x['createdAt'], reverse=True)
    for record in sorted_records:
        record['createdAt'] = record['createdAt'].isoformat()
    
    return jsonify({'history': sorted_records})


# ============= Mood Analytics Endpoints =============

@app.route('/api/mood/analytics', methods=['GET'])
@token_required
def mood_analytics(current_user):
    user_moods = [m for m in moods_data if m.get('email') == current_user['email']]
    
    # Mood distribution
    mood_counts = {}
    for mood_record in user_moods:
        mood = mood_record.get('mood', 'neutral')
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    # Weekly trends
    weekly_trends = {}
    for mood_record in user_moods:
        date = mood_record.get('createdAt', datetime.datetime.utcnow())
        week_start = (date - datetime.timedelta(days=date.weekday())).date()
        if str(week_start) not in weekly_trends:
            weekly_trends[str(week_start)] = {}
        mood = mood_record.get('mood', 'neutral')
        weekly_trends[str(week_start)][mood] = weekly_trends[str(week_start)].get(mood, 0) + 1
    
    # Average wellness score
    wellness_score = min(100, 50 + len(user_moods) * 2)  # Simple calculation
    
    return jsonify({
        'totalEntries': len(user_moods),
        'moodDistribution': mood_counts,
        'weeklyTrends': weekly_trends,
        'wellnessScore': wellness_score
    })


# ============= Psychology Questions Endpoints =============

@app.route('/api/psychology/next-question', methods=['POST'])
@token_required
def get_next_question(current_user):
    data = request.json or {}
    current_mood = data.get('mood', 'neutral')
    question_type = data.get('type', 'follow_up')
    
    if question_type == 'greeting':
        questions = PSYCHOLOGY_QUESTIONS_DB['greeting']
    elif question_type == 'follow_up' and current_mood in PSYCHOLOGY_QUESTIONS_DB['mood_follow_up']:
        questions = PSYCHOLOGY_QUESTIONS_DB['mood_follow_up'][current_mood]
    else:
        questions = PSYCHOLOGY_QUESTIONS_DB['supporting_questions']
    
    question = random.choice(questions)
    return jsonify({
        'question': question,
        'type': question_type,
        'mood': current_mood
    })


@app.route('/api/psychology/wellness-suggestion', methods=['GET'])
@token_required
def get_wellness_suggestion(current_user):
    suggestion = random.choice(PSYCHOLOGY_QUESTIONS_DB['wellness_suggestions'])
    return jsonify({
        'suggestion': suggestion,
        'message': f'Would you like to try {suggestion}?'
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
