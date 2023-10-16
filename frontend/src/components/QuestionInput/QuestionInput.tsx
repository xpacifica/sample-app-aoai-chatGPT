import { useEffect, useState } from "react";
import { Stack, TextField, Dropdown, IDropdownOption } from "@fluentui/react";
import { SendRegular, Mic28Regular, Mic28Filled } from "@fluentui/react-icons";
import Send from "../../assets/Send.svg";
import styles from "./QuestionInput.module.css";
import { AudioConfig, ResultReason, SpeechConfig, SpeechRecognizer, AutoDetectSourceLanguageConfig } from "microsoft-cognitiveservices-speech-sdk";
import { getTokenOrRefresh } from "../../api";
import { isSafari, isFirefox } from 'react-device-detect';
import { SpeechToken } from "../../api";

interface Props {
    onSend: ({question, id, fromMic}:{question: string, id?: string, fromMic: boolean}) => void;
    disabled: boolean;
    placeholder?: string;
    clearOnSend?: boolean;
    conversationId?: string;
    selectedLanguage: string;
    onLanguageSelect: (language:string) => void;
}

const options: IDropdownOption[] = [
    { key: 'en-US', text: 'en-US' },
    { key: 'de-DE', text: 'de-DE' },
    { key: 'nl-NL', text: 'nl-NL'},
    { key: 'auto', text: 'auto'},
];

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId, selectedLanguage, onLanguageSelect }: Props) => {
    const [question, setQuestion] = useState<string>("");
    const [isMicOn, setIsMicOn] = useState<boolean>(false);
    const [shouldAutoSubmit, setShouldAutoSubmit] = useState<boolean>(false);
    const [authenticationData, setAuthenticationData] = useState<SpeechToken | undefined>()

    const sendQuestion = (fromMic:boolean = false) => {
        if (disabled || !question.trim()) {
            return;
        }

        if(conversationId){
            onSend({question, id:conversationId, fromMic});
        }else{
            onSend({question, fromMic});
        }

        if (clearOnSend) {
            setQuestion("");
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            sendQuestion();
        }
    };

    const handleSpeechToText = () => {
        setIsMicOn(true);        

        if(!authenticationData || authenticationData.authToken === null || authenticationData.region === undefined) throw new Error("Fetching auth token for Speech API failed");
        const speechConfig = SpeechConfig.fromAuthorizationToken(
            authenticationData.authToken,
            authenticationData.region
        );

        const audioConfig = AudioConfig.fromDefaultMicrophoneInput();

        const isAutoLanguageDetectionEnabled = selectedLanguage.toLowerCase() === 'auto';

        console.log(`auto language? ${isAutoLanguageDetectionEnabled}`);
        console.log(selectedLanguage);

        if (!isAutoLanguageDetectionEnabled) {
            speechConfig.speechRecognitionLanguage = selectedLanguage;
        }

        const autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig.fromLanguages([
            "en-US",
            "de-DE",
            "nl-NL",
        ]);

        const speechRecognizer = isAutoLanguageDetectionEnabled ? SpeechRecognizer.FromConfig(
            speechConfig,
            autoDetectSourceLanguageConfig,
            audioConfig
        ) : new SpeechRecognizer(speechConfig, audioConfig);

        speechRecognizer?.recognizeOnceAsync(result => {
            if (result.reason === ResultReason.RecognizedSpeech) {
                console.log(`you spoke: "${result.text}"`);
                setQuestion(`${question} ${result.text}`);
                setShouldAutoSubmit(true);
            }
            setIsMicOn(false);
        });
    };

    useEffect(() => {
        if(!authenticationData){
            getTokenOrRefresh().then(res => setAuthenticationData(res)).catch(err => console.error(err));
        }

        const setAuthInterval = setInterval(() => {
            getTokenOrRefresh().then(res => setAuthenticationData(res)).catch(err => console.error(err))
        }, 8 * 60 * 1000);

        return () => clearInterval(setAuthInterval);
    }, []);

    /* Listener to determine if the latest user prompt comes from mic. 
     * If yes, then submit the question/message immediately after the question is set, without the user pressing enter or clicking submit */
     useEffect(() =>{
        if (shouldAutoSubmit) {
            setTimeout(() => {
                sendQuestion(true);
                setShouldAutoSubmit(false);
            }, 1000); 
        }
    }, [shouldAutoSubmit]);

    const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        setQuestion(newValue || "");
    };

    const sendQuestionDisabled = disabled || !question.trim();

    return (
        <Stack horizontal className={styles.questionInputContainer}>
            {!isFirefox && !isSafari &&
                <div className={styles.questionInputSpeechButtonContainer} 
                    role="button" 
                    tabIndex={0}
                    aria-label="Speak to microphone button"
                    onClick={handleSpeechToText}
                >
                    { isMicOn ? <Mic28Filled/> : <Mic28Regular/> }
                </div>
            }
            <TextField
                className={styles.questionInputTextArea}
                placeholder={placeholder}
                multiline
                resizable={false}
                borderless
                value={question}
                onChange={onQuestionChange}
                onKeyDown={onEnterPress}
            />
            {!isFirefox && !isSafari &&
                <Dropdown 
                    options={options} 
                    placeholder="Select a language" 
                    className={styles.dropdownLanguageSelector}
                    aria-label="Dropdown selector to select a language for the speech input and output"
                    defaultSelectedKey={selectedLanguage} 
                    onChange={(e, selection) => { 
                        onLanguageSelect((selection as IDropdownOption).key as string);
                    }}
                />
            }
            <div className={styles.questionInputSendButtonContainer} 
                role="button" 
                tabIndex={1}
                aria-label="Ask question button"
                onClick={()=>sendQuestion()}
                onKeyDown={e => e.key === "Enter" || e.key === " " ? sendQuestion() : null}
            >
                { sendQuestionDisabled ? 
                    <SendRegular className={styles.questionInputSendButtonDisabled}/>
                    :
                    <img src={Send} className={styles.questionInputSendButton}/>
                }
            </div>
            <div className={styles.questionInputBottomBorder} />
        </Stack>
    );
};
