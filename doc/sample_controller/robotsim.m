classdef robotsim
    %ROBOTSIM シミュレータと接続するためのクラス
    %   シミュレータと接続するためのクラス．
    
    properties
        baseurl
    end
    
    methods
        function obj = robotsim(baseurl)
            %ROBOT このクラスのインスタンスを作成
            %   baseurlに接続先のシミュレータの基底URLを指定する．
            %   他のPCのシミュレータにも接続できるはず
            obj.baseurl = baseurl;
        end
        function [] = reset(obj)
            %RESET シミュレータをリセットする．
            %   世界と全てのロボットを削除し，新たな世界を生成する
            py.requests.post([obj.baseurl,'reset'],pyargs('data',{}));
        end
        function id = spawn(obj, p)
            %SPAWN ロボットを新たに生成する
            %   生成されたロボット識別するためのIDを返す
            data = struct();
            if nargin>=2
                data.p = p;
            end
            res = py.requests.post([obj.baseurl,'spawn'],pyargs('data',data));
            res = jsondecode(char(res.text));
            id = string(res.id);
        end
        
        function state = wait(obj, id)
            %WAIT ロボットを待機状態で維持したままシミュレータを1時刻進める
            %   初期状態ではロボットの関節が死点にあるので関節のばねを使って
            %   可制御な状態になるのを待つためだけの関数
            data = struct('id',id,'u',[0,0,0], 'doControl', false);
      
            res = py.requests.post([obj.baseurl,'control'],pyargs('data',data));
            state = jsondecode(char(res.text));
        end
        
        function state = control(obj, id, u, info)
            %CONTROL ロボットの状態を取得し，制御入力を印加する
            %   シミュレータはこのコマンドを受け取った時点でのロボットの状態を返し
            %   その後指定した制御入力のもとで1ステップ時刻を進める．
            %   状態と制御入力の時間差に注意すること
            %   control か wait が発行されない限りシミュレータの時間は停止したままである．
            %   つまり，この関数の呼び出し頻度によってシミュレータの時間を実時間に対して
            %   加速したり減速したりすることができる．これはデバッグのために有用である．
            
            
            data = struct('id',id,'u',u, 'doControl', true);
            if nargin>=4
                data.info = info;
            end
            res = py.requests.post([obj.baseurl,'control'],pyargs('data',data));
            state = jsondecode(char(res.text));
        end
        function res = screenshot(obj)
            res = webread([obj.baseurl,'screenshot']);
        end
        
        function res = getfloor(obj)
            res = webread([obj.baseurl,'getfloor']);
        end
    end
end

