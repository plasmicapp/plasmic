import { useState, useEffect } from "react";

interface HookProps {
    keyword: string
}
export const useFetch = ({ keyword }: HookProps) => {
    const [giphyId, setGiphyId] = useState("");

    useEffect(() => {
        if (keyword) fetchGiphy();
    }, [keyword]);

    const fetchGiphy = async () => {
        try {
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=X1q3afkDR9WHSZJhLS6H9yYTQMPIWOTK&q=${keyword
                    .split(" ")
                    .join("")}&limit=1`
            );

            const { data } = await response.json();

            setGiphyId(data[0]?.id);
        } catch (error) {
            console.log("Error in gif api retrieval: ", error);
            setGiphyId("");
        }
    };
    return giphyId;
};
