// LIVEASTA CSV import parsing utilities.
// Pure parsing/normalization helpers; no DOM, Supabase or application state.

function csvImportNormalize(value){
            return String(value??'')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g,'')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g,'');
        }

function csvImportDetectDelimiter(text){
            const first=String(text||'')
                .replace(/^\uFEFF/,'')
                .split(/\r?\n/)
                .find(line=>line.trim())||'';

            const candidates=[',',';','\t'];
            let best=',',bestCount=-1;

            for(const delimiter of candidates){
                let count=0;
                let quoted=false;

                for(let i=0;i<first.length;i++){
                    const ch=first[i];

                    if(ch==='"'){
                        if(quoted && first[i+1]==='"'){
                            i++;
                        }else{
                            quoted=!quoted;
                        }
                    }else if(ch===delimiter && !quoted){
                        count++;
                    }
                }

                if(count>bestCount){
                    best=delimiter;
                    bestCount=count;
                }
            }

            return best;
        }

function parseCsvRows(text){
            const source=String(text||'').replace(/^\uFEFF/,'');
            const delimiter=csvImportDetectDelimiter(source);

            const rows=[];
            let row=[];
            let cell='';
            let quoted=false;

            for(let i=0;i<source.length;i++){
                const ch=source[i];

                if(ch==='"'){
                    if(quoted && source[i+1]==='"'){
                        cell+='"';
                        i++;
                    }else{
                        quoted=!quoted;
                    }
                    continue;
                }

                if(ch===delimiter && !quoted){
                    row.push(cell.trim());
                    cell='';
                    continue;
                }

                if((ch==='\n'||ch==='\r') && !quoted){
                    if(ch==='\r' && source[i+1]==='\n')i++;
                    row.push(cell.trim());
                    cell='';

                    if(row.some(v=>String(v).trim()!=='')){
                        rows.push(row);
                    }

                    row=[];
                    continue;
                }

                cell+=ch;
            }

            row.push(cell.trim());
            if(row.some(v=>String(v).trim()!==''))rows.push(row);

            return {rows,delimiter};
        }

function csvImportHeaderIndex(headers,aliases){
            const normalized=headers.map(csvImportNormalize);
            for(const alias of aliases){
                const target=csvImportNormalize(alias);
                const index=normalized.indexOf(target);
                if(index>=0)return index;
            }
            return -1;
        }

function csvImportLooksLikeHeader(row){
            const normalized=(row||[]).map(csvImportNormalize);
            const known=new Set([
                'fantasquadra','squadrafantasy','squadrafanta','team','nomesquadra',
                'id','idgiocatore','playerid',
                'giocatore','calciatore','nome','nomegiocatore',
                'prezzo','costo','crediti','prezzoacquisto','acquisto',
                'ruolo','r','rm','ruolomantra',
                'club','squadrareale','squadraclub'
            ]);
            return normalized.some(v=>known.has(v));
        }

function csvImportColumnMap(headers){
            const explicitFantasyTeam=csvImportHeaderIndex(headers,[
                'Fantasquadra','Squadra fantasy','Squadra fanta','Nome squadra','Team'
            ]);

            return {
                team: explicitFantasyTeam>=0
                    ? explicitFantasyTeam
                    : csvImportHeaderIndex(headers,['Squadra']),
                id: csvImportHeaderIndex(headers,['ID','Id giocatore','Player ID']),
                name: csvImportHeaderIndex(headers,['Giocatore','Calciatore','Nome giocatore','Nome']),
                price: csvImportHeaderIndex(headers,['Prezzo','Costo','Crediti','Prezzo acquisto','Acquisto']),
                role: csvImportHeaderIndex(headers,['Ruolo','R','RM','Ruolo Mantra']),
                club: explicitFantasyTeam>=0
                    ? csvImportHeaderIndex(headers,['Club','Squadra reale','Squadra'])
                    : csvImportHeaderIndex(headers,['Club','Squadra reale'])
            };
        }

function csvImportPrice(value){
            const clean=String(value??'')
                .trim()
                .replace(/[€\s]/g,'')
                .replace(',','.');
            const n=Number(clean);
            if(!Number.isFinite(n))return NaN;
            return Math.round(n);
        }
